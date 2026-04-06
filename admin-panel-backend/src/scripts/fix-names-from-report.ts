import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    try {
        console.log('🔄 Connecting to DB...');
        await AppDataSource.initialize();
        console.log('✅ Connected.');

        const reportPath = path.resolve(__dirname, '../../../reelly_match_report.json');
        if (!fs.existsSync(reportPath)) {
            console.error(`❌ Report file not found: ${reportPath}`);
            return;
        }

        console.log('📖 Reading match report...');
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const matchedItems = report.matched || [];
        
        console.log(`📊 Found ${matchedItems.length} matched items to process.`);

        const propertyRepo = AppDataSource.getRepository(Property);
        let updatedCount = 0;
        let skippedCount = 0;

        for (const item of matchedItems) {
            const { dbId, reellyName, score } = item;
            
            // Only update if score is high enough (0.8+) to be sure
            if (score < 0.8) {
                skippedCount++;
                continue;
            }

            try {
                const property = await propertyRepo.findOne({ where: { id: dbId } });
                
                if (property) {
                    // Check if name is actually different or currently a description (long)
                    const isLongName = property.name && property.name.length > 100;
                    const isDifferent = property.name !== reellyName;
                    
                    if (isDifferent || isLongName) {
                        const oldName = property.name;
                        property.name = reellyName;
                        
                        // Also update localized names if they look like they need it
                        if (!property.nameEn || property.nameEn.length > 100 || property.nameEn === oldName) {
                            property.nameEn = reellyName;
                        }
                        
                        // We keep Ru/Ar as is unless they are identical to the old broken name
                        if (property.nameRu === oldName) property.nameRu = reellyName;
                        if (property.nameAr === oldName) property.nameAr = reellyName;

                        await propertyRepo.save(property);
                        updatedCount++;
                        
                        if (updatedCount % 50 === 0) {
                            console.log(`⏳ Updated ${updatedCount} properties...`);
                        }
                    } else {
                        skippedCount++;
                    }
                } else {
                    skippedCount++;
                }
            } catch (err: any) {
                console.error(`❌ Failed to update property ${dbId}:`, err.message);
            }
        }

        console.log(`\n✅ Finished!`);
        console.log(`✨ Updated: ${updatedCount}`);
        console.log(`⏭️  Skipped: ${skippedCount}`);

    } catch (e: any) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

run();
