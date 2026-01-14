import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Property } from '../entities/Property';
import { entities } from '../entities';

const DB_PORT = 5434;
const DB_USER = 'admin';
const DB_PASS = 'admin123';
const DB_NAME = 'admin_panel';

async function countMigrated() {
    try {
        const customDataSource = new DataSource({
            type: 'postgres',
            host: 'localhost',
            port: DB_PORT,
            username: DB_USER,
            password: DB_PASS,
            database: DB_NAME,
            entities: entities,
            synchronize: false,
            logging: false,
        });

        await customDataSource.initialize();
        const propertyRepo = customDataSource.getRepository(Property);

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

            const migratedCount = prop.photos.filter(p => p.includes('your-objectstorage.com')).length;
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

        await customDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

countMigrated();
