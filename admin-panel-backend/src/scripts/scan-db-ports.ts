import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Property } from '../entities/Property';
import { entities } from '../entities';

const CREDENTIALS = 'postgresql://admin:REDACTED_DB_PASSWORD@localhost';
const PORTS = [5432, 5434, 5435, 5436];
const DB_NAME = 'foryou_admin_panel'; // Also try 'admin_panel' if needed

async function checkPort(port: number) {
    const url = `${CREDENTIALS}:${port}/${DB_NAME}`;
    console.log(`Checking connection to port ${port} with DB ${DB_NAME}...`);

    const ds = new DataSource({
        type: 'postgres',
        url: url,
        entities: entities,
        synchronize: false,
        logging: false
    });

    try {
        await ds.initialize();
        const count = await ds.getRepository(Property).count();
        console.log(`✅ Success on port ${port}: Found ${count} properties.`);
        await ds.destroy();
        return count;
    } catch (e) {
        // Try alternate DB name 'admin_panel'
        try {
            const url2 = `${CREDENTIALS}:${port}/admin_panel`;
            const ds2 = new DataSource({
                type: 'postgres',
                url: url2,
                entities: entities,
                synchronize: false,
                logging: false
            });
            await ds2.initialize();
            const count = await ds2.getRepository(Property).count();
            console.log(`✅ Success on port ${port} (DB: admin_panel): Found ${count} properties.`);
            await ds2.destroy();
            return count;
        } catch (e2) {
            console.log(`❌ Failed on port ${port}: ${(e as Error).message}`);
        }
    }
    return 0;
}

async function scan() {
    for (const port of PORTS) {
        await checkPort(port);
    }
}

scan();
