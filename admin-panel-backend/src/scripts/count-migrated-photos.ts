import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';

async function countMigrated() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        const propertyRepo = AppDataSource.getRepository(Property);

        const count = await propertyRepo.count();
        console.log(`Total properties in DB: ${count}`);

        const allProperties = await propertyRepo.find({
            select: ['id', 'photos']
        });

        let totalWithPhotos = 0;
        let fullyMigrated = 0;
        let partiallyMigrated = 0;
        let notMigrated = 0;
        let totalPhotos = 0;
        let migratedPhotos = 0;

        for (const prop of allProperties) {
            if (!prop.photos || prop.photos.length === 0) continue;

            totalWithPhotos++;
            totalPhotos += prop.photos.length;

            const migratedCount = prop.photos.filter((p: string) => p.includes('your-objectstorage.com')).length;
            migratedPhotos += migratedCount;

            if (migratedCount === prop.photos.length) {
                fullyMigrated++;
            } else if (migratedCount > 0) {
                partiallyMigrated++;
            } else {
                notMigrated++;
            }
        }

        console.log('--- Migration Status ---');
        console.log(`Total Properties with Photos: ${totalWithPhotos}`);
        console.log(`Fully Migrated Properties: ${fullyMigrated}`);
        console.log(`Partially Migrated Properties: ${partiallyMigrated}`);
        console.log(`Not Migrated Properties: ${notMigrated}`);
        console.log('--- Photo Stats ---');
        console.log(`Total Photos: ${totalPhotos}`);
        console.log(`Migrated Photos: ${migratedPhotos} (${totalPhotos > 0 ? ((migratedPhotos / totalPhotos) * 100).toFixed(2) : 0}%)`);

        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

countMigrated();
