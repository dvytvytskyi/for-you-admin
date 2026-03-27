/**
 * Reelly Units Parser
 * 
 * Кроки:
 * 1. Завантажує всі наші off-plan properties з БД
 * 2. Матчує їх з проектами в reelly_all_projects.json по назві
 * 3. Для кожного збігу парсить всі юніти через Reelly API
 * 4. Зберігає юніти в таблицю property_units
 */

const https = require('https');
const { Client } = require('pg');
const fs = require('fs');

// =============== CONFIG ===============
const XANO_TOKEN = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.2fwnV_dqhvVzYgwCm7jJ0itZpfibwjqVRcp4_XRLcIdufJS9ufYeKb1HIwZfTA6MTVUhrmwCn761v8UhIxbOKqv-JSe9ZCjS.DAnZ8YuGZODmL5v6rgq25Q.qR66Kf2-MPNRyoQvaZgPIzecVLbVcAEMmgJkfzsMcEBIFnCLUXYN4WNQu-ZTkdt71OGtzZchwCRCSkLY_eHadMktZ8JYGf_U3v_pt8PUhKh_LRAa3zn9oEpFb6NbpoxKVrUVTZFGaAXH1zmUi7xjgQ.6bDYIACNhwEFzqKULlGLIl_6SfBn8DdXJJw87LVLWCU';
const REELLY_BASE = 'https://api-reelly.up.railway.app/api/internal';
const DB_URL = 'postgresql://admin:admin123@127.0.0.1:5435/admin_panel';
const REELLY_PROJECTS_FILE = '/Users/vytvytskyi/admin_for_you/reelly_all_projects.json';
const OUTPUT_FILE = '/Users/vytvytskyi/admin_for_you/reelly_units_parsed.json';
const MATCH_REPORT_FILE = '/Users/vytvytskyi/admin_for_you/reelly_match_report.json';

// =============== HELPERS ===============
const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'origin': 'https://find.reelly.io',
        'referer': 'https://find.reelly.io/',
        'xano-authorization': XANO_TOKEN,
        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36'
      }
    };
    https.get(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Normalize string for matching (lowercase, remove extra spaces, special chars)
function normalize(str) {
  return (str || '')
    .toLowerCase()
    .replace(/\s+by\s+.*/g, '') // Remove "by [Developer]"
    .replace(/[''`]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fuzzy match score between two strings (0 to 1)
function matchScore(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  
  // Word overlap
  const wordsA = na.split(' ').filter(w => w.length > 2);
  const wordsB = nb.split(' ').filter(w => w.length > 2);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  
  const overlap = wordsA.filter(w => wordsB.includes(w)).length;
  const maxWords = Math.max(wordsA.length, wordsB.length);
  return overlap / maxWords;
}

// Fetch all units for a given Reelly project ID
async function fetchAllUnits(projectId) {
  const allUnits = [];
  let url = `${REELLY_BASE}/projects/${projectId}/units?limit=100`;
  
  while (url) {
    try {
      const data = await fetchJson(url);
      if (data.results && Array.isArray(data.results)) {
        allUnits.push(...data.results);
      }
      url = data.next || null;
      if (url) await sleep(300);
    } catch (e) {
      console.error(`    ⚠️  Error fetching units for project ${projectId}: ${e.message}`);
      break;
    }
  }
  
  return allUnits;
}

// Map Reelly unit_type to our UnitType enum
function mapUnitType(unitType) {
  const mapping = {
    'apartments': 'apartment',
    'apartment': 'apartment',
    'villa': 'villa',
    'villas': 'villa',
    'penthouse': 'penthouse',
    'penthouses': 'penthouse',
    'townhouse': 'townhouse',
    'townhouses': 'townhouse',
    'office': 'office',
    'offices': 'office',
    'duplex': 'apartment',
    'studio': 'apartment',
  };
  return mapping[(unitType || '').toLowerCase()] || 'apartment';
}

// =============== MAIN ===============
async function main() {
  console.log('🚀 Reelly Units Parser запущено\n');
  
  // 1. Connect to DB
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  console.log('✅ Підключено до БД\n');

  // 2. Load Reelly projects
  console.log('📂 Завантажую reelly_all_projects.json...');
  const reellyProjects = JSON.parse(fs.readFileSync(REELLY_PROJECTS_FILE, 'utf8'));
  console.log(`   Знайдено ${reellyProjects.length} Reelly проектів\n`);

  // Build lookup map for Reelly projects by normalized name
  const reellyByName = new Map();
  for (const rp of reellyProjects) {
    reellyByName.set(normalize(rp.name), rp);
  }

  // 3. Load our off-plan properties from DB
  console.log('📊 Завантажую off-plan properties з БД...');
  const { rows: dbProperties } = await db.query(
    `SELECT id, name, externalid FROM properties WHERE "propertyType" = 'off-plan' ORDER BY name`
  );
  console.log(`   Знайдено ${dbProperties.length} off-plan properties в БД\n`);

  // 4. Match our properties with Reelly projects
  console.log('🔗 Матчую properties з Reelly проектами...\n');
  
  const matched = [];
  const unmatched = [];
  const MATCH_THRESHOLD = 0.7;

  for (const prop of dbProperties) {
    let bestMatch = null;
    let bestScore = 0;

    // Try exact match first
    const exactMatch = reellyByName.get(normalize(prop.name));
    if (exactMatch) {
      bestMatch = exactMatch;
      bestScore = 1.0;
    } else {
      // Fuzzy match
      for (const rp of reellyProjects) {
        const score = matchScore(prop.name, rp.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = rp;
        }
      }
    }

    if (bestScore >= MATCH_THRESHOLD && bestMatch) {
      matched.push({
        dbProp: prop,
        reellyProject: bestMatch,
        score: bestScore
      });
      const icon = bestScore === 1.0 ? '✅' : '🔶';
      console.log(`${icon} [${bestScore.toFixed(2)}] "${prop.name}" → Reelly #${bestMatch.id} "${bestMatch.name}"`);
    } else {
      unmatched.push({ dbProp: prop, bestMatch, bestScore });
      if (bestScore > 0.3) {
        console.log(`❌ [${bestScore.toFixed(2)}] "${prop.name}" → Найкраще: "${bestMatch?.name}" (нижче порогу)`);
      }
    }
  }

  console.log(`\n📈 Результат матчингу: ${matched.length} збігів / ${unmatched.length} без збігу\n`);

  // Save match report
  const matchReport = {
    summary: { matched: matched.length, unmatched: unmatched.length, total: dbProperties.length },
    matched: matched.map(m => ({
      dbId: m.dbProp.id,
      dbName: m.dbProp.name,
      reellyId: m.reellyProject.id,
      reellyName: m.reellyProject.name,
      score: m.score
    })),
    unmatched: unmatched
      .sort((a, b) => b.bestScore - a.bestScore)
      .map(u => ({
        dbId: u.dbProp.id,
        dbName: u.dbProp.name,
        bestMatch: u.bestMatch?.name,
        score: u.bestScore
      }))
  };
  fs.writeFileSync(MATCH_REPORT_FILE, JSON.stringify(matchReport, null, 2));
  console.log(`📄 Match report збережено в ${MATCH_REPORT_FILE}\n`);

  // 5. Fetch units for matched properties
  console.log('📥 Парсимо юніти для кожного збігу...\n');
  
  const allResults = [];
  let totalUnits = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (let i = 0; i < matched.length; i++) {
    const { dbProp, reellyProject } = matched[i];
    
    process.stdout.write(`[${i+1}/${matched.length}] Fetching units for "${dbProp.name}" (Reelly #${reellyProject.id})... `);
    
    const units = await fetchAllUnits(reellyProject.id);
    process.stdout.write(`${units.length} юнітів\n`);
    
    totalUnits += units.length;
    
    if (units.length === 0) {
      await sleep(200);
      continue;
    }

    // Collect results for output file
    allResults.push({
      propertyId: dbProp.id,
      propertyName: dbProp.name,
      reellyProjectId: reellyProject.id,
      units
    });

    // 6. Insert units into DB (clear old, insert fresh)
    // Delete old units for this property (clean re-import)
    await db.query(`DELETE FROM property_units WHERE "propertyId" = $1`, [dbProp.id]);
    
    let insertedForProp = 0;
    for (const unit of units) {
      const unitId = unit.name; // e.g. "SOL-1-116"
      const unitType = mapUnitType(unit.unit_type);
      const price = unit.price || 0;
      const totalSize = unit.size || 0; // size in m²
      const planImage = unit.layout?.images?.[0]?.image?.url || null;
      const bedrooms = unit.bedrooms || null;
      const floor = unit.floor || null;
      const status = unit.status || null;
      const externalId = unit.id ? unit.id.toString() : null;

      try {
        await db.query(`
          INSERT INTO property_units ("propertyId", "unitId", type, "planImage", "totalSize", price, bedrooms, floor, status, externalid)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [dbProp.id, unitId, unitType, planImage, totalSize, price, bedrooms, floor, status, externalId]);
        totalInserted++;
        insertedForProp++;
      } catch (e) {
        console.error(`\n    ❌ DB error for unit ${unitId}: ${e.message}`);
        totalSkipped++;
      }
    }
    process.stdout.write(`   → Inserted ${insertedForProp} units\n`);

    await sleep(500); // Rate limit
  }

  // Save all parsed units to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ПАРСИНГ ЗАВЕРШЕНО!');
  console.log(`   Matched properties:   ${matched.length}`);
  console.log(`   Total units fetched:  ${totalUnits}`);
  console.log(`   Units inserted:       ${totalInserted}`);
  console.log(`   Units updated:        ${totalSkipped}`);
  console.log(`   Output file:          ${OUTPUT_FILE}`);
  console.log(`   Match report:         ${MATCH_REPORT_FILE}`);
  console.log('='.repeat(60));

  await db.end();
}

main().catch(e => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});
