const fs = require('fs');
const https = require('https');

const XANO_TOKEN = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.Y8giCilAfAena_Fuq4QnmoiVDU3jB6zdsYxuL6-MYD9cq-zhOz7TsuzW-eKMwloeUm2a3xwaPNwaN3xLR0ftaUtRytohdImU.NfB0A48awsYl9YocxNja2A.6haS2soz_kXo0ltKXWGIBes5ZWzFpJsKxcYFQJ4AcNmgq8q38Y4GmLDMKK17cgF9tkGPXPxtNQVxYO7oCNhSt3F0j_fU_OLNwOzXI07Tr5JoUZxUE1nnUkIK158FnN1TrIz0ni3x5SDNoIMLGERi1w.ALJxuWmg1Z2gHHyzq61A1awVqZmNZxT2AjVVYsAtmk8';
const ALL_PROJECTS_FILE = '/root/admin-panel/reelly_all_projects.json';
const PARSED_UNITS_FILE = '/root/reelly_units_parsed.json';
const OUTPUT_FILE = '/root/reelly_units_parsed_updated.json';

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

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAllUnits(projectId) {
  const allUnits = [];
  let url = `https://api-reelly.up.railway.app/api/internal/projects/${projectId}/units?limit=100`;
  while (url) {
    const data = await fetchJson(url);
    if (data.results && Array.isArray(data.results)) {
      allUnits.push(...data.results);
    }
    url = data.next || null;
    if (url) await sleep(200);
  }
  return allUnits;
}

async function run() {
  const allProjects = JSON.parse(fs.readFileSync(ALL_PROJECTS_FILE, 'utf8'));
  const parsedUnits = JSON.parse(fs.readFileSync(PARSED_UNITS_FILE, 'utf8'));
  const parsedNames = new Set(parsedUnits.map(p => p.propertyName.toLowerCase()));

  const missing = allProjects.filter(p => !parsedNames.has(p.name.toLowerCase()));
  console.log(`📊 Found ${missing.length} missing projects to parse...`);

  const results = [...parsedUnits];

  for (let i = 0; i < missing.length; i++) {
    const p = missing[i];
    process.stdout.write(`[${i+1}/${missing.length}] Parsing ${p.name} (ID: ${p.id})... `);
    try {
      const units = await fetchAllUnits(p.id);
      results.push({ propertyName: p.name, units: units });
      process.stdout.write(`${units.length} units.\n`);
      if (i % 10 === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      if (e.message.includes('401') || e.message.includes('Forbidden')) {
         console.log('❌ Token expired! Stopping.');
         break;
      }
    }
    await sleep(200);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log('✅ Done!');
}

run();
