/**
 * Update Properties with Reelly IDs
 * 
 * Takes the reelly_match_report.json and updates properties.externalid 
 * for all matched properties where score is high.
 */

const { Client } = require('pg');
const fs = require('fs');

const DB_URL = 'postgresql://admin:admin123@127.0.0.1:5435/admin_panel';
const MATCH_REPORT_FILE = '/Users/vytvytskyi/admin_for_you/reelly_match_report.json';

async function main() {
    console.log('🔗 Updating properties with Reelly External IDs...');
    
    const db = new Client({ connectionString: DB_URL });
    await db.connect();

    const report = JSON.parse(fs.readFileSync(MATCH_REPORT_FILE, 'utf8'));
    const matched = report.matched;

    console.log(`Found ${matched.length} matches in report.`);

    let updated = 0;
    for (const m of matched) {
        // Only update if score is 0.8 or higher to be safe
        if (m.score >= 0.8) {
            await db.query(
                `UPDATE properties SET externalid = $1 WHERE id = $2`,
                [m.reellyId.toString(), m.dbId]
            );
            updated++;
        }
    }

    console.log(`✅ Successfully updated ${updated} properties with externalid.`);
    await db.end();
}

main().catch(console.error);
