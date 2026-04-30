import { DataSource } from 'typeorm';
import { Property } from '../entities/Property';
import { entities } from '../entities';

async function checkProperty() {
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: process.env.DB_PASS ?? '',
        database: 'for_you_real_estate',
        entities: entities,
        synchronize: false,
        logging: false,
    });

    const propertyId = '98ff1979-7600-42d0-9154-dd4916552152';

    try {
        await ds.initialize();
        console.log('Connected to database on port 5432');
        const results = await ds.query(`SELECT * FROM properties WHERE id = $1`, [propertyId]);

        if (results && results.length > 0) {
            console.log('Property found:');
            console.log(JSON.stringify(results[0], null, 2));
        } else {
            console.log('Property NOT found on port 5432');
        }

        await ds.destroy();
    } catch (e) {
        console.error('Error:', (e as any).message);
    }
}

checkProperty();
