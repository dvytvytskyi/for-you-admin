const fs = require('fs');
const { Client } = require('pg');

async function run() {
  const dbConfig = { user: 'admin', host: '127.0.0.1', database: 'admin_panel', password: 'admin123', port: 5435 };
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Підключилися до БД');

    console.log('🗑️  Очищуємо старі юніти off-plan...');
    await client.query(`
      DELETE FROM property_units 
      WHERE "propertyId" IN (
        SELECT id FROM properties WHERE "propertyType" IN ('off-plan', 'new-launches', 'exclusive-for-you')
      )
    `);

    console.log('📊 Отримуємо поточні Off-Plan properties...');
    const result = await client.query('SELECT id, name FROM properties WHERE "propertyType" IN (\'off-plan\', \'new-launches\', \'exclusive-for-you\')');
    const existingProps = result.rows;
    
    const normalize = str => (str || '').toLowerCase()
      .replace(/\s+by\s+.*/g, '')
      .replace(/['`\-_]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    function calculateScore(a, b) {
      const na = normalize(a).replace(/\s+/g, '');
      const nb = normalize(b).replace(/\s+/g, '');
      if (na === nb) return 1.0;
      if (na.includes(nb) || nb.includes(na)) return 0.9;
      
      const wordsA = normalize(a).split(' ').filter(w => w.length > 2);
      const wordsB = normalize(b).split(' ').filter(w => w.length > 2);
      if (wordsA.length === 0 || wordsB.length === 0) return 0;
      
      const overlap = wordsA.filter(w => wordsB.includes(w)).length;
      return overlap / Math.max(wordsA.length, wordsB.length);
    }

    console.log(`🔎 Завантажуємо JSON: ./reelly_units_parsed.json`);
    const parsedData = JSON.parse(fs.readFileSync('./reelly_units_parsed.json', 'utf8'));

    let totalInserted = 0;
    let matchedProjects = 0;
    
    // Create mapping: ReellyProjectName -> [PropertyID]
    const matchMap = new Map();

    console.log('🧠 Розраховуємо Fuzzy Matches...');
    for (const item of parsedData) {
      const reellyName = item.propertyName;
      const targets = [];

      for (const p of existingProps) {
        const score = calculateScore(reellyName, p.name);
        if (score >= 0.7) {
          targets.push(p.id);
        }
      }

      if (targets.length > 0) {
        matchMap.set(reellyName, targets);
        matchedProjects++;
      }
    }

    console.log(`🚀 Починаємо імпорт юнітів для ${matchedProjects} матчів...`);

    for (const item of parsedData) {
      const matchedIds = matchMap.get(item.propertyName);
      if (!matchedIds) continue;
      
      for (const propertyId of matchedIds) {
        let insertedForProp = 0;
        for (const unit of item.units) {
          function mapUnitType(unitType) {
            const mapping = {
              'apartments': 'apartment', 'apartment': 'apartment',
              'villa': 'villa', 'villas': 'villa',
              'penthouse': 'penthouse', 'penthouses': 'penthouse',
              'townhouse': 'townhouse', 'townhouses': 'townhouse',
              'office': 'office', 'offices': 'office',
              'duplex': 'apartment', 'studio': 'apartment'
            };
            return mapping[(unitType || '').toLowerCase()] || 'apartment';
          }

          const unitId = unit.name || 'Unknown';
          const unitType = mapUnitType(unit.unit_type);
          const price = unit.price || 0;
          const totalSize = unit.size || 0;
          const planImage = unit.layout?.images?.[0]?.image?.url || null;
          const bedrooms = unit.bedrooms || null;
          const floor = unit.floor || null;
          const status = unit.status || null;
          const externalId = unit.id ? String(unit.id) : null;

          try {
            await client.query(`
              INSERT INTO property_units ("propertyId", "unitId", "type", "planImage", "totalSize", "price", "bedrooms", "floor", "status", "externalId")
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [propertyId, unitId, unitType, planImage, totalSize, price, bedrooms, floor, status, externalId]);
            totalInserted++;
            insertedForProp++;
          } catch (err) {
            // skip duplicates
          }
        }
        if (insertedForProp > 0) {
          // console.log(`✅ ${item.propertyName} -> ID ${propertyId} (+${insertedForProp})`);
        }
      }
    }
    
    console.log('\n=========================');
    console.log(`🎉 Завершено!`);
    console.log(`   Матч проектів: ${matchedProjects} / ${parsedData.length}`);
    console.log(`   Усього юнітів: ${totalInserted}`);
    console.log('=========================');

  } catch (e) {
    console.error('Fatal error:', e);
  } finally {
    await client.end();
  }
}

run();
