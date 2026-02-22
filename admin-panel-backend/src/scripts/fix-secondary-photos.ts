import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';
import * as path from 'path';

async function fixSecondaryPhotos() {
    try {
        console.log('🔄 Connecting to database...');
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const jsonPath = path.resolve(process.cwd(), 'secondary.json');
        if (!fs.existsSync(jsonPath)) {
            console.error('❌ secondary.json not found at ' + jsonPath);
            process.exit(1);
        }

        console.log('📖 Reading secondary.json...');
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`📊 Found ${data.length} items in JSON`);

        const propertyRepo = AppDataSource.getRepository(Property);

        console.log('🔄 Fetching all secondary properties from DB...');
        const dbProperties = await propertyRepo.find({
            where: { propertyType: PropertyType.SECONDARY },
            select: ['id', 'name', 'latitude', 'longitude', 'photos']
        });
        console.log(`📊 Found ${dbProperties.length} secondary properties in DB`);

        // Create a map for fast lookup
        // Using a combination of name and coordinates as key
        const dbMap = new Map<string, any>();
        for (const p of dbProperties) {
            const key = `${p.name}_${Number(p.latitude).toFixed(6)}_${Number(p.longitude).toFixed(6)}`;
            dbMap.set(key, p);
        }

        let updatedCount = 0;
        let skippedCount = 0;

        console.log('🔄 Matching and updating...');

        // Process in batches to avoid memory issues or overhead
        const BATCH_SIZE = 1000;
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            const updates = [];

            for (const item of batch) {
                const lat = item.coordinates?.latitude;
                const lng = item.coordinates?.longitude;
                if (!lat || !lng) continue;

                const key = `${item.title}_${Number(lat).toFixed(6)}_${Number(lng).toFixed(6)}`;
                const dbProp = dbMap.get(key);

                if (dbProp && (!dbProp.photos || dbProp.photos.length === 0)) {
                    if (item.images && item.images.length > 0) {
                        // Extract URLs from images array
                        const photoUrls = item.images.map((img: any) => typeof img === 'string' ? img : img.image).filter(Boolean);
                        if (photoUrls.length > 0) {
                            updates.push(propertyRepo.update(dbProp.id, { photos: photoUrls }));
                            updatedCount++;
                        }
                    }
                } else {
                    skippedCount++;
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
            }
            console.log(`Progress: ${Math.min(i + BATCH_SIZE, data.length)}/${data.length} (Updated: ${updatedCount})`);
        }

        console.log('✅ Finished!');
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped: ${skippedCount}`);

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixSecondaryPhotos();
