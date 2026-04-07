import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    try {
        console.log('🔄 Connecting to DB...');
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log('✅ Connected.');

        // Smart path finding for the JSON report
        const possiblePaths = [
            path.resolve(__dirname, '../../../reelly_match_report.json'),
            path.resolve(__dirname, '../../reelly_match_report.json'),
            path.resolve(__dirname, '../reelly_match_report.json'),
            path.resolve(process.cwd(), 'reelly_match_report.json'),
            path.resolve(process.cwd(), '../reelly_match_report.json'),
        ];
        
        let reportPath = '';
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                reportPath = p;
                break;
            }
        }

        if (!reportPath) {
            console.error(`❌ Report file reelly_match_report.json not found in any of:`, possiblePaths);
            return;
        }

        console.log(`📖 Using match report: ${reportPath}`);
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const matchedItems = report.matched || [];
        
        console.log(`📊 Found ${matchedItems.length} matched items to process.`);

        const propertyRepo = AppDataSource.getRepository(Property);
        let updatedCount = 0;
        let skippedCount = 0;

        // Keywords that usually start a description instead of a name
        const descriptionMarkers = [
            'welcome to', 'experience', 'discover', 'embodies', 'located in', 
            'presents', 'exclusive', 'sophistication', 'luxury', 'nestled'
        ];

        for (const item of matchedItems) {
            const { dbId, reellyName, score } = item;
            
            // Score 0.8+ is reliable enough for names
            if (score < 0.8) {
                skippedCount++;
                continue;
            }

            try {
                const property = await propertyRepo.findOne({ where: { id: dbId } });
                
                if (property) {
                    const currentName = property.name || '';
                    const lowerName = currentName.toLowerCase();
                    
                    // Logic to determine if current name is actually a description
                    const isTooLong = currentName.length > 70;
                    const looksLikeSentence = currentName.includes('. ') || currentName.includes(', ');
                    const startsWithMarker = descriptionMarkers.some(m => lowerName.startsWith(m));
                    const containsMarker = descriptionMarkers.slice(0, 5).some(m => lowerName.includes(m));

                    const isBrokenName = isTooLong || looksLikeSentence || startsWithMarker || containsMarker;
                    const isDifferent = currentName !== reellyName;
                    
                    if (isDifferent && (isBrokenName || currentName === 'Unknown Project' || !currentName)) {
                        const oldName = currentName;
                        property.name = reellyName;
                        
                        // Always clean localized names if they are broken
                        if (!property.nameEn || property.nameEn.length > 70 || property.nameEn === oldName || property.nameEn.includes('. ')) {
                            property.nameEn = reellyName;
                        }
                        
                        // Sync others if they look suspicious
                        if (property.nameRu === oldName || !property.nameRu || property.nameRu.length > 100) property.nameRu = reellyName;
                        if (property.nameAr === oldName || !property.nameAr || property.nameAr.length > 100) property.nameAr = reellyName;

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
        console.log(`✨ Aggressively Updated: ${updatedCount}`);
        console.log(`⏭️  Skipped (already clean): ${skippedCount}`);

    } catch (e: any) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

run();
