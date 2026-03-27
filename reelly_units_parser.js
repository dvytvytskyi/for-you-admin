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
const XANO_TOKEN = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.D_U94G39vrrC290HAQbt2jl-UWYd3l3tuIPLMhwMenNYwHlf-NuK68VCi0uZvFUhgFHyY4K1UA9xDupjoiF-zkqHz69Dmtia.LxX0gUkWvXAbLUz6r0Wd4g.Djywueskya-h_rjldIyIHwQE-gdUH4SKoX_fRh-j_xzEp_l2o62wmuuJtCnSQ4hDQGgXzCdddVGoOT48aLKwpy4F4b-6vU1Davdz3LRW_7KCkSNcj_AN6v3HoziUjWjvirgXJOupmlY8L7nv-bWUPv7PkqqXd6xlGqdYEAVzyHI.WAuN4RHw4yFMOywuk3DWjn52fvAczrhrd_D-EFCfO9o';
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
  const commonWords = new Set(['tower', 'towers', 'residences', 'residence', 'residency', 'dubai', 'the', 'project', 'block', 'building', 'north', 'south', 'east', 'west', 'phase', 'stage']);
  
  const na = normalize(a).replace(/^the\s+/, '');
  const nb = normalize(b).replace(/^the\s+/, '');
  
  if (na === nb) return 1.0;
  
  const wordsA = na.split(' ').filter(w => w.length > 2 && !commonWords.has(w));
  const wordsB = nb.split(' ').filter(w => w.length > 2 && !commonWords.has(w));
  
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  
  // High overlap of meaningful words
  const overlap = wordsA.filter(w => wordsB.includes(w)).length;
  const maxWords = Math.max(wordsA.length, wordsB.length);
  const score = overlap / maxWords;
  
  // Partial inclusion bonus for special cases
  if (na.includes(nb) || nb.includes(na)) return Math.max(score, 0.85);
  
  return score;
}

// Manual Mapping for known properties with different names in Reelly
const MANUAL_PROJECT_MAP = {
  'Nova Tower': 80, // Binghatti Nova
  'The Strand Lunara': 1990, // Guessing something nearby or checking common IDs
};

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
  console.log('🚀 Reelly Units Parser v2 запущено\n');
  
  // 1. Connect to DB
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  console.log('✅ Підключено до БД\n');

  // 2. Load Reelly projects
  console.log('📂 Завантажую reelly_all_projects.json...');
  const reellyProjects = JSON.parse(fs.readFileSync(REELLY_PROJECTS_FILE, 'utf8'));
  console.log(`   Знайдено ${reellyProjects.length} Reelly проектів\n`);

  // 3. Load our off-plan properties from DB
  console.log('📊 Завантажую off-plan properties з БД...');
  const { rows: dbProperties } = await db.query(
    `SELECT id, name FROM properties WHERE "propertyType" = 'off-plan' ORDER BY name`
  );
  console.log(`   Знайдено ${dbProperties.length} off-plan properties в БД\n`);

  // 4. Match our properties with Reelly projects
  console.log('🔗 Матчую properties з Reelly проектами...\n');
  
  const matched = [];
  const unmatched = [];
  const MATCH_THRESHOLD = 0.65; // Lowered to be more inclusive

  for (const prop of dbProperties) {
    let bestMatch = null;
    let bestScore = 0;

    // Manual override check
    if (MANUAL_PROJECT_MAP[prop.name]) {
      const targetId = MANUAL_PROJECT_MAP[prop.name];
      bestMatch = reellyProjects.find(p => p.id === targetId);
      if (bestMatch) {
         bestScore = 1.0;
         console.log(`⭐ [MANUAL] "${prop.name}" matched with Reelly #${bestMatch.id}`);
      }
    }

    if (!bestMatch) {
      for (const rp of reellyProjects) {
        const score = matchScore(prop.name, rp.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = rp;
        }
      }
    }

    if (bestScore >= MATCH_THRESHOLD && bestMatch) {
      matched.push({ dbProp: prop, reellyProject: bestMatch, score: bestScore });
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

  // 5. Fetch units for matched properties
  for (let i = 0; i < matched.length; i++) {
    const { dbProp, reellyProject } = matched[i];
    
    process.stdout.write(`[${i+1}/${matched.length}] "${dbProp.name}" (Reelly #${reellyProject.id})... `);
    const units = await fetchAllUnits(reellyProject.id);
    
    if (units.length === 0) {
      process.stdout.write(`0 юнітів (skip)\n`);
      continue;
    }

    // 📊 GROUPING BY LAYOUT (UNIQUE CATEGORIES)
    const uniqueLayouts = new Map();
    let propMinPrice = Infinity, propMinBedrooms = Infinity, propMaxBedrooms = -Infinity;
    let propMinSize = Infinity, propMaxSize = -Infinity;

    for (const u of units) {
      const price = u.price || 0, bedrooms = u.bedrooms || 0, size = u.size || 0;
      if (price > 0 && price < propMinPrice) propMinPrice = price;
      if (bedrooms < propMinBedrooms) propMinBedrooms = bedrooms;
      if (bedrooms > propMaxBedrooms) propMaxBedrooms = bedrooms;
      if (size > 0 && size < propMinSize) propMinSize = size;
      if (size > propMaxSize) propMaxSize = size;

      const layoutName = u.layout_type || (u.layout && u.layout.name) || 'Unit';
      const key = `${Math.floor(bedrooms)}BR_${u.unit_type}_${u.layout?.id || layoutName}`;
      
      if (!uniqueLayouts.has(key)) {
        uniqueLayouts.set(key, u);
      } else {
        // Keep the cheapest one for the category
        const current = uniqueLayouts.get(key);
        if (price > 0 && (!current.price || price < current.price)) {
          uniqueLayouts.set(key, u);
        }
      }
    }

    const unitTypesJson = Array.from(uniqueLayouts.values()).map(u => ({
      bedrooms: u.bedrooms,
      type: u.unit_type,
      minPrice: u.price,
      maxPrice: u.price,
      minSize: u.size,
      maxSize: u.size,
      planImage: u.layout?.images?.[0]?.image?.url || null
    })).sort((a,b) => a.bedrooms - b.bedrooms);

    // Update main property stats
    await db.query(`
      UPDATE properties SET 
        "priceFrom" = $1, "bedroomsFrom" = $2, "bedroomsTo" = $3,
        "sizeFrom" = $4, "sizeTo" = $5, "unitTypesJson" = $6
      WHERE id = $7
    `, [
      propMinPrice === Infinity ? null : propMinPrice,
      propMinBedrooms === Infinity ? null : Math.floor(propMinBedrooms),
      propMaxBedrooms === -Infinity ? null : Math.floor(propMaxBedrooms),
      propMinSize === Infinity ? null : propMinSize,
      propMaxSize === -Infinity ? null : propMaxSize,
      JSON.stringify(unitTypesJson),
      dbProp.id
    ]);

    // Clear old units and insert UNIQUE LAYOUTS
    await db.query(`DELETE FROM property_units WHERE "propertyId" = $1`, [dbProp.id]);
    
    const finalUnits = Array.from(uniqueLayouts.values());
    for (const u of finalUnits) {
      const layoutName = u.layout_type || (u.layout && u.layout.name) || u.name || 'Layout';
      await db.query(`
        INSERT INTO property_units ("propertyId", "unitId", type, "planImage", "totalSize", price, bedrooms, floor, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        dbProp.id, 
        layoutName, // Use layout name as unitId for display
        mapUnitType(u.unit_type), 
        u.layout?.images?.[0]?.image?.url || null, 
        u.size || 0, u.price || 0, u.bedrooms || 0, 
        u.floor || 0, u.status || 'available'
      ]);
    }
    process.stdout.write(`${finalUnits.length} унікальних планувань завантажено\n`);
    await sleep(200);
  }

  await db.end();
  console.log('\n' + '='.repeat(60));
  console.log('✅ ПАРСИНГ ЗАВЕРШЕНО!');
  console.log(`   Matched properties:   ${matched.length}`);
  console.log(`   Unmatched properties: ${unmatched.length}`);
  console.log('='.repeat(60));
}

main().catch(e => {
  console.error('💥 Fatal error:', e);
  process.exit(1);
});
