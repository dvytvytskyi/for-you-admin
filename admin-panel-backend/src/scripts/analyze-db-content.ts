import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Property, PropertyType } from '../entities/Property';
import { entities } from '../entities';

const DB_PORT = 5434;
const DB_USER = 'admin';
const DB_PASS = 'admin123';
const DB_NAME = 'admin_panel';

async function analyzeProperties() {
    const ds = new DataSource({
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

    try {
        await ds.initialize();
        const repo = ds.getRepository(Property);

        const total = await repo.count();
        const offPlan = await repo.count({ where: { propertyType: PropertyType.OFF_PLAN } });

        console.log(`Total Properties: ${total}`);
        console.log(`Off-Plan Properties: ${offPlan}`);

        // Select ONLY photos to avoid schema errors
        const props = await repo.find({
            select: ['id', 'photos'],
            take: 100
        });

        let reellyLinks = 0;
        let otherLinks = 0;
        let hetznerLinks = 0;
        let totalPhotosInSample = 0;

        for (const p of props) {
            if (!p.photos) continue;
            totalPhotosInSample += p.photos.length;
            for (const ph of p.photos) {
                if (ph.includes('reelly') || ph.includes('rielly')) reellyLinks++;
                else if (ph.includes('your-objectstorage.com')) hetznerLinks++;
                else otherLinks++;
            }
        }

        console.log('--- Sample Stats (first 100 props) ---');
        console.log(`Total Photos in sample: ${totalPhotosInSample}`);
        console.log(`Avg Photos per property: ${totalPhotosInSample / 100}`);
        console.log(`Reelly/Old links found: ${reellyLinks}`);
        console.log(`Hetzner (Migrated) links found: ${hetznerLinks}`);
        console.log(`Other links found: ${otherLinks}`);

        if (totalPhotosInSample > 0) {
            console.log('Sample Photo URL:', props[0].photos?.[0]);
        }

        await ds.destroy();
    } catch (e) {
        console.error(e);
    }
}

analyzeProperties();
