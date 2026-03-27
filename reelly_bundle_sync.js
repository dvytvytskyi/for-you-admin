const fs = require('fs');
const https = require('https');
const { Client } = require('pg');

const XANO_TOKEN = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.Y8giCilAfAena_Fuq4QnmoiVDU3jB6zdsYxuL6-MYD9cq-zhOz7TsuzW-eKMwloeUm2a3xwaPNwaN3xLR0ftaUtRytohdImU.NfB0A48awsYl9YocxNja2A.6haS2soz_kXo0ltKXWGIBes5ZWzFpJsKxcYFQJ4AcNmgq8q38Y4GmLDMKK17cgF9tkGPXPxtNQVxYO7oCNhSt3F0j_fU_OLNwOzXI07Tr5JoUZxUE1nnUkIK158FnN1TrIz0ni3x5SDNoIMLGERi1w.ALJxuWmg1Z2gHHyzq61A1awVqZmNZxT2AjVVYsAtmk8';
const DB_CONFIG = { user: 'admin', host: '127.0.0.1', database: 'admin_panel', password: 'admin123', port: 5435 };
const PROJECTS_FILE = '/root/reelly_all_projects_LATEST.json';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const normalize = s => (s || '').toLowerCase()
  .replace(/\s+by\s+.*/g, '')
  .replace(/['`\-_]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function calculateScore(a, b) {
  const na = normalize(a).replace(/\s+/g, '');
  const nb = normalize(b).replace(/\s+/g, '');
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const wa = normalize(a).split(' ').filter(w => w.length > 2);
  const wb = normalize(b).split(' ').filter(w => w.length > 2);
  if (!wa.length || !wb.length) return 0;
  const overlap = wa.filter(w => wb.includes(w)).length;
  return overlap / Math.max(wa.length, wb.length);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'xano-authorization': XANO_TOKEN, 'origin': 'https://find.reelly.io', 'referer': 'https://find.reelly.io/', 'user-agent': 'Mozilla/5.0' } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}: ${d.substring(0, 100)}`));
        else resolve(JSON.parse(d));
      });
    }).on('error', reject);
  });
}

async function run() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('✅ DB Connected');

  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
  const { rows: dbProps } = await client.query('SELECT id, name FROM properties WHERE \"propertyType\" IN (\'off-plan\', \'new-launches\', \'exclusive-for-you\')');
  console.log(`📊 DB Projects: ${dbProps.length}. Reelly Projects: ${projects.length}.`);

  // Map Reelly_ID -> [DB_IDs]
  const reellyToDb = new Map();
  let matches = 0;
  for (const rp of projects) {
    const list = [];
    for (const dp of dbProps) {
      if (calculateScore(rp.name, dp.name) >= 0.75) list.push(dp.id);
    }
    if (list.length > 0) {
      reellyToDb.set(rp.id, list);
      matches++;
    }
  }
  console.log(`🧩 Found ${matches} Reelly projects matching DB properties.`);

  // DB_ID -> Array of Units
  const dbUnitsBundle = new Map();

  console.log('📥 Fetching all units from Reelly sequentially...');
  for (let i = 0; i < projects.length; i++) {
    const rp = projects[i];
    const dbIds = reellyToDb.get(rp.id);
    if (!dbIds) continue;

    process.stdout.write(`[${i+1}/${projects.length}] Fetching units for ${rp.name} (#${rp.id})... `);
    
    try {
      const units = [];
      let url = `https://api-reelly.up.railway.app/api/internal/projects/${rp.id}/units?limit=100`;
      while (url) {
        const data = await fetchJson(url);
        if (data.results) units.push(...data.results);
        url = data.next || null;
        if (url) await sleep(200);
      }
      process.stdout.write(`${units.length} units.\n`);

      if (units.length > 0) {
        for (const dbId of dbIds) {
          if (!dbUnitsBundle.has(dbId)) dbUnitsBundle.set(dbId, []);
          dbUnitsBundle.get(dbId).push(...units);
        }
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      if (e.message.includes('401')) break;
    }
    await sleep(250);
  }

  console.log('\n🚀 Starting DB update for all matched projects...');
  const bundledIds = Array.from(dbUnitsBundle.keys());
  
  for (let j = 0; j < bundledIds.length; j++) {
    const dbId = bundledIds[j];
    const units = dbUnitsBundle.get(dbId);

    // Deduplicate units by their internal Reelly id (externalId)
    const uniqueUnits = Array.from(new Map(units.map(u => [u.id, u])).values());

    process.stdout.write(`[${j+1}/${bundledIds.length}] Updating DB ID ${dbId}: ${uniqueUnits.length} unique units... `);

    // Clean old
    await client.query('DELETE FROM property_units WHERE \"propertyId\" = $1', [dbId]);

    let minP = Infinity, minBR = Infinity, maxBR = -Infinity, minS = Infinity, maxS = -Infinity;
    
    for (const u of uniqueUnits) {
      const type = (u.unit_type || '').toLowerCase().includes('villa') ? 'villa' : 'apartment';
      const p = u.price || 0; const s = u.size || 0; const br = parseFloat(u.bedrooms) || 0;
      if (p > 0 && p < minP) minP = p;
      if (br < minBR) minBR = br; if (br > maxBR) maxBR = br;
      if (s > 0 && s < minS) minS = s; if (s > maxS) maxS = s;

      await client.query(
        `INSERT INTO property_units (\"propertyId\", \"unitId\", type, \"planImage\", \"totalSize\", price, bedrooms, floor, status, \"externalId\")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [dbId, u.name || 'Unknown', type, u.layout?.images?.[0]?.image?.url || null, s, p, br, u.floor || null, u.status || null, u.id?.toString()]
      );
    }
    
    // Update property stats
    await client.query(
      `UPDATE properties SET \"priceFrom\" = $1, \"bedroomsFrom\" = $2, \"bedroomsTo\" = $3, \"sizeFrom\" = $4, \"sizeTo\" = $5 WHERE id = $6`,
      [minP === Infinity ? null : minP, minBR === Infinity ? null : minBR, maxBR === -Infinity ? null : maxBR, minS === Infinity ? null : minS, maxS === -Infinity ? null : maxS, dbId]
    );
    process.stdout.write('Stats updated.\n');
  }

  await client.end();
  console.log('✅ Bundle Sync Done!');
}

run();
