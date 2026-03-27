const fs = require('fs');
const https = require('https');

const API_KEY = 'reelly-6fc1f239-h60hVIPkCKjAL9ReWn1LkHUZPnvZM65s';
const BASE_URL = 'https://search-listings-production.up.railway.app/v1/properties';
const MAX_CONCURRENCY = 1;
const OUTPUT_FILE = 'reelly_all_projects.json';

// Utility to fetch data via https
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'X-API-Key': API_KEY,
        'accept': 'application/json',
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`Status ${res.statusCode}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function fetchAllPropertyIds() {
  console.log('Fetching list of properties to get all project IDs...');
  let page = 1;
  const ids = [];
  
  while (true) {
    try {
      console.log(`Fetching page ${page}...`);
      const response = await fetchJson(`${BASE_URL}?page=${page}&limit=50`);
      
      if (!response.items || response.items.length === 0) break;
      
      response.items.forEach(item => {
        if (item.id) ids.push(item.id);
      });
      
      if (!response.pagination || !response.pagination.has_next) break;
      
      page++;
      await sleep(100); 
    } catch (e) {
      console.error(`Error fetching page ${page}:`, e.message);
      await sleep(2000); // retry wait
      try {
        const response = await fetchJson(`${BASE_URL}?page=${page}&limit=50`);
        response.items.forEach(item => { if (item.id) ids.push(item.id); });
        if (!response.pagination || !response.pagination.has_next) break;
        page++;
      } catch (retryError) {
        console.error(`Failed to retry page ${page}, stopping list fetch. Error:`, retryError.message);
        break;
      }
    }
  }
  
  console.log(`Successfully fetched ${ids.length} property IDs.`);
  return ids;
}

async function fetchPropertyDetails(id, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const data = await fetchJson(`${BASE_URL}/${id}`);
      return data;
    } catch (e) {
      if (attempt === retries) {
        console.error(`Error fetching details for ID ${id}:`, e.message);
        return null;
      }
      // exponential backoff
      await sleep(1000 * attempt); 
    }
  }
}

async function runParser() {
  try {
    const ids = await fetchAllPropertyIds();
    const uniqueIds = [...new Set(ids)];
    console.log(`Unique project IDs: ${uniqueIds.length}`);
    
    // Load existing results to resume if previously failed
    let results = [];
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
            console.log(`Resuming from ${results.length} already fetched projects...`);
        } catch(e) {}
    }

    const fetchedIds = new Set(results.map(r => r.id));
    const idsToFetch = uniqueIds.filter(id => !fetchedIds.has(id));
    
    console.log(`Need to fetch: ${idsToFetch.length} projects.`);
    
    let processed = 0;
    
    // Sequential processing to avoid 503 limits
    for (let i = 0; i < idsToFetch.length; i++) {
      const id = idsToFetch[i];
      const data = await fetchPropertyDetails(id);
      
      if (data) {
        results.push(data);
      }
      
      processed++;
      process.stdout.write(`\rFetched details for ${processed}/${idsToFetch.length} projects...`);
      
      // Save progressively every 50 projects
      if (processed % 50 === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      }

      await sleep(500); // 0.5s safety delay between requests
    }
    
    console.log('\nFinished fetching all details.');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`Saved ${results.length} projects to ${OUTPUT_FILE}`);
    
  } catch (e) {
    console.error('Script failed:', e);
  }
}

runParser();
