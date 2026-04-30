import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { entities } from '../entities';
import { Property } from '../entities/Property';

// 1. Check Port 5432 (Default Postgres)
async function checkPostgresPort() {
    console.log('--- Checking Port 5432 (postgres/postgres) ---');
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: process.env.DB_PASS ?? '',
        database: 'for_you_real_estate',
        synchronize: false,
        logging: false,
    });

    try {
        await ds.initialize();
        // Check tables manually since we don't know if Entity matches 100%
        const res = await ds.query('SELECT count(*) FROM properties'); // Assuming table is properties
        console.log(`✅ Port 5432 (for_you_real_estate): Found ${res[0].count} properties`);
        await ds.destroy();
    } catch (e) {
        console.log(`❌ Port 5432 Failed: ${(e as Error).message}`);
    }
}

// 2. Check Port 5435 (New Admin Panel DB)
async function checkNewAdminPort() {
    console.log('--- Checking Port 5435 (admin/admin123) ---');
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5435, // mapped to 5432 in container
        username: 'admin',
        password: process.env.DB_PASS ?? '',
        database: 'admin_panel',
        entities: entities, // Try with our entities
        synchronize: false,
        logging: false,
    });

    try {
        await ds.initialize();
        const repo = ds.getRepository(Property);
        const count = await repo.count();
        console.log(`✅ Port 5435 (admin_panel): Found ${count} properties`);
        await ds.destroy();
    } catch (e) {
        console.log(`❌ Port 5435 Failed: ${(e as Error).message}`);
    }
}

async function run() {
    await checkPostgresPort();
    await checkNewAdminPort();
    process.exit(0);
}

run();
