const fs = require('fs');
const https = require('https');
const { Client } = require('pg');

const XANO_TOKEN = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.Y8giCilAfAena_Fuq4QnmoiVDU3jB6zdsYxuL6-MYD9cq-zhOz7TsuzW-eKMwloeUm2a3xwaPNwaN3xLR0ftaUtRytohdImU.NfB0A48awsYl9YocxNja2A.6haS2soz_kXo0ltKXWGIBes5ZWzFpJsKxcYFQJ4AcNmgq8q38Y4GmLDMKK17cgF9tkGPXPxtNQVxYO7oCNhSt3F0j_fU_OLNwOzXI07Tr5JoUZxUE1nnUkIK158FnN1TrIz0ni3x5SDNoIMLGERi1w.ALJxuWmg1Z2gHHyzq61A1awVqZmNZxT2AjVVYsAtmk8';
const DB_CONFIG = { user: 'admin', host: '127.0.0.1', database: 'admin_panel', password: 'admin123', port: 5435 };
const PROJECTS_FILE = '/root/reelly_all_projects_LATEST.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'xano-authorization': XANO_TOKEN, 'origin': 'https://find.reelly.io' } }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode !== 200) reject(new Error(`HTTP ${res.statusCode}`));
        else resolve(JSON.parse(d));
      });
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const normalize = s => (s || '').toLowerCase().replace(/\s+by\s+.*/g, '').replace(/['`\-_]/g, '').replace(/\s+/g, ' ').trim();

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

async function run() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('✅ DB Connected');

  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
  const { rows: dbProps } = await client.query('SELECT id, name FROM properties WHERE \"propertyType\" IN (\'off-plan\', \'new-launches\', \'exclusive-for-you\')');
  console.log(`📊 DB: ${dbProps.length} props. Reelly: ${projects.length} projects.`);

  const matches = [];
  for (const rp of projects) {
    for (const dp of dbProps) {
      if (calculateScore(rp.name, dp.name) >= 0.75) {
        matches.push({ dbId: dp.id, reellyId: rp.id, name: dp.name });
      }
    }
  }
  console.log(`🧩 Found ${matches.length} fuzzy matches.`);

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    process.stdout.write(`[${i+1}/${matches.length}] ${m.name} (#${m.reellyId})... `);
    try {
      const units = [];
      let url = `https://api-reelly.up.railway.app/api/internal/projects/${m.reellyId}/units?limit=100`;
      while (url) {
        const data = await fetchJson(url);
        if (data.results) units.push(...data.results);
        url = data.next || null;
        if (url) await sleep(200);
      }
      process.stdout.write(`${units.length} units. `);

      if (units.length > 0) {
        await client.query('DELETE FROM property_units WHERE \"propertyId\" = $1', [m.dbId]);
        let minP = Infinity, minBR = Infinity, maxBR = -Infinity, minS = Infinity, maxS = -Infinity;
        
        for (const u of units) {
          const type = (u.unit_type || '').toLowerCase().includes('villa') ? 'villa' : 'apartment';
          const p = u.price || 0; const s = u.size || 0; const br = u.bedrooms || 0;
          if (p > 0 && p < minP) minP = p;
          if (br < minBR) minBR = br; if (br > maxBR) maxBR = br;
          if (s > 0 && s < minS) minS = s; if (s > maxS) maxS = s;

          await client.query(
            `INSERT INTO property_units (\"propertyId\", \"unitId\", type, \"planImage\", \"totalSize\", price, bedrooms, floor, status, \"externalId\")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [m.dbId, u.name || 'Unknown', type, u.layout?.images?.[0]?.image?.url || null, s, p, br, u.floor || null, u.status || null, u.id?.toString()]
          );
        }
        
        // Update property stats
        await client.query(
          `UPDATE properties SET \"priceFrom\" = $1, \"bedroomsFrom\" = $2, \"bedroomsTo\" = $3, \"sizeFrom\" = $4, \"sizeTo\" = $5 WHERE id = $6`,
          [minP === Infinity ? null : minP, minBR === Infinity ? null : minBR, maxBR === -Infinity ? null : maxBR, minS === Infinity ? null : minS, maxS === -Infinity ? null : maxS, m.dbId]
        );
        process.stdout.write('Stats updated.\n');
      } else {
        process.stdout.write('Skipped (0 units).\n');
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      if (e.message.includes('401')) break;
    }
    await sleep(200);
  }

  await client.end();
  console.log('✅ Full Sync Done!');
}

run();
