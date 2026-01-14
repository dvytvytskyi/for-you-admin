import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Property } from '../entities/Property';
import { entities } from '../entities';

async function checkCorrectCredentials() {
    const port = 5434;
    const password = 'admin123';
    const db = 'admin_panel';
    const user = 'admin';

    const url = `postgresql://${user}:${password}@localhost:${port}/${db}`;
    console.log(`Checking specific connection: ${url}`);

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
        console.log(`✅✅ SUCCESS! Found ${count} properties.`);
        await ds.destroy();
        process.exit(0);
    } catch (e) {
        console.log(`❌ Failed: ${(e as Error).message}`);
        process.exit(1);
    }
}

checkCorrectCredentials();
