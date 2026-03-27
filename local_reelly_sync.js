const fs = require('fs');
const { Client } = require('pg');

const DB_CONFIG = {
  user: 'admin',
  host: '127.0.0.1',
  database: 'admin_panel',
  password: 'admin123',
  port: 5435
};

const PROJECTS_FILE = './reelly_all_projects.json';

const normalizeFull = s => (s || '').toLowerCase().replace(/['`\-_,]/g, '').replace(/\s+/g, ' ').trim();
const normalizeSimple = s => (s || '').toLowerCase().replace(/\s+by\s+.*/g, '').replace(/['`\-_,]/g, '').replace(/\s+/g, '').trim();

async function run() {
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    console.log('✅ DB Connected');

    if (!fs.existsSync(PROJECTS_FILE)) {
      console.error(`❌ Projects file not found: ${PROJECTS_FILE}`);
      return;
    }

    const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    const { rows: dbProps } = await client.query('SELECT id, name FROM properties WHERE \"propertyType\" IN (\'off-plan\', \'new-launches\', \'exclusive-for-you\')');
    
    console.log(`📊 DB: ${dbProps.length}. Reelly: ${projects.length}.`);

    let updatedCount = 0;
    for (const rp of projects) {
      if (!rp.name) continue;
      const rNameSimple = normalizeSimple(rp.name);
      
      const matchedDbIds = [];
      for (const dp of dbProps) {
        if (normalizeFull(dp.name).includes(rNameSimple) || normalizeSimple(dp.name).includes(rNameSimple)) {
          matchedDbIds.push(dp.id);
        }
      }

      if (matchedDbIds.length > 0) {
        const statusMap = {
          'under_construction': 'Under Construction',
          'completed': 'Ready',
          'planned': 'Off-Plan'
        };
        const saleMap = {
          'on_sale': 'On Sale',
          'out_of_stock': 'Sold Out',
          'presale': 'Presale',
          'start_of_sales': 'Newly Launched'
        };

        const status = statusMap[rp.status] || rp.status;
        const saleStatus = saleMap[rp.sale_status] || rp.sale_status;
        const completion = rp.completion_datetime || rp.construction_end_date ? new Date(rp.completion_datetime || rp.construction_end_date).toISOString() : null;
        const readiness = rp.readiness || '';
        const type = rp.type || '';
        
        // Extract views from facilities if they contain "View"
        const allFacilities = Array.isArray(rp.facilities) ? rp.facilities.map(f => f.name || f) : [];
        const viewsList = allFacilities.filter(f => typeof f === 'string' && f.toLowerCase().includes('view'));
        const views = JSON.stringify(viewsList);
        
        const minPrice = rp.min_price || null;
        const maxPrice = rp.max_price || null;
        const minPriceAed = rp.min_price_aed || null;
        const maxPriceAed = rp.max_price_aed || null;

        for (const id of matchedDbIds) {
          await client.query(
            `UPDATE properties SET 
              status = $1, 
              \"saleStatus\" = $2, 
              \"completionDatetime\" = $3,
              readiness = $4,
              type = $5,
              views = $6,
              \"minPrice\" = $7,
              \"maxPrice\" = $8,
              \"minPriceAed\" = $9,
              \"maxPriceAed\" = $10
            WHERE id = $11`,
            [status, saleStatus, completion, readiness, type, views, minPrice, maxPrice, minPriceAed, maxPriceAed, id]
          );
          updatedCount++;
        }
      }
    }

    console.log(`✅ Metadata sync complete! Updated ${updatedCount} properties.`);
  } catch (error) {
    console.error('❌ Error during sync:', error);
  } finally {
    await client.end();
  }
}

run();
