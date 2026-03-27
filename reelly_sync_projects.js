const fs = require('fs');
const https = require('https');

const XANO_TOKEN = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.Y8giCilAfAena_Fuq4QnmoiVDU3jB6zdsYxuL6-MYD9cq-zhOz7TsuzW-eKMwloeUm2a3xwaPNwaN3xLR0ftaUtRytohdImU.NfB0A48awsYl9YocxNja2A.6haS2soz_kXo0ltKXWGIBes5ZWzFpJsKxcYFQJ4AcNmgq8q38Y4GmLDMKK17cgF9tkGPXPxtNQVxYO7oCNhSt3F0j_fU_OLNwOzXI07Tr5JoUZxUE1nnUkIK158FnN1TrIz0ni3x5SDNoIMLGERi1w.ALJxuWmg1Z2gHHyzq61A1awVqZmNZxT2AjVVYsAtmk8';
const OUTPUT_FILE = '/root/reelly_all_projects_LATEST.json';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'xano-authorization': XANO_TOKEN,
        'origin': 'https://find.reelly.io',
        'referer': 'https://find.reelly.io/',
        'user-agent': 'Mozilla/5.0'
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

async function run() {
  const allProjects = [];
  let url = 'https://api-reelly.up.railway.app/api/internal/projects?limit=100';
  
  console.log('🚀 Fetching all 1,833 projects from Reelly...');
  
  while (url) {
    process.stdout.write(`📥 Fetching ${url.split('offset=')[1] || '0'}... `);
    try {
      const data = await fetchJson(url);
      if (data.results && Array.isArray(data.results)) {
        allProjects.push(...data.results);
        process.stdout.write(`received ${data.results.length} projects (total: ${allProjects.length})\n`);
      }
      url = data.next || null;
      if (url) await sleep(300);
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      break;
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allProjects, null, 2));
  console.log(`✅ Saved ${allProjects.length} projects to ${OUTPUT_FILE}`);
}

run();
