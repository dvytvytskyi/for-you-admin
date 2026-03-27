const fs = require('fs');
const { Client } = require('pg');

const DB_CONFIG = { user: 'admin', host: '127.0.0.1', database: 'admin_panel', password: 'admin123', port: 5435 };
const PROJECTS_FILE = '/root/reelly_all_projects_LATEST.json';

const normalizeFull = s => (s || '').toLowerCase().replace(/['`\-_,]/g, '').replace(/\s+/g, ' ').trim();
const normalizeSimple = s => (s || '').toLowerCase().replace(/\s+by\s+.*/g, '').replace(/['`\-_,]/g, '').replace(/\s+/g, '').trim();

async function run() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('✅ DB Connected');

  const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
  const { rows: dbProps } = await client.query('SELECT id, name FROM properties WHERE \"propertyType\" IN (\'off-plan\', \'new-launches\', \'exclusive-for-you\')');
  
  console.log(`📊 DB: ${dbProps.length}. Reelly: ${projects.length}.`);

  let updatedCount = 0;
  for (const rp of projects) {
    const rNameSimple = normalizeSimple(rp.name);
    
    // Find all matching DB props
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
      const completion = rp.construction_end_date ? new Date(rp.construction_end_date).toISOString() : null;
      
      for (const id of matchedDbIds) {
        await client.query(
          `UPDATE properties SET status = $1, \"saleStatus\" = $2, \"completionDatetime\" = $3 WHERE id = $4`,
          [status, saleStatus, completion, id]
        );
        updatedCount++;
      }
    }
  }

  await client.end();
  console.log(`✅ Metadata sync complete! Updated ${updatedCount} properties.`);
}

run();
