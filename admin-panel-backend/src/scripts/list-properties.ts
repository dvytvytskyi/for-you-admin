import { DataSource } from 'typeorm';
import { entities } from '../entities';

async function listProperties() {
    const ds = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 5432,
        username: 'postgres',
        password: process.env.DB_PASS ?? '',
        database: 'admin_panel_propart',
        entities: entities,
        synchronize: false,
        logging: false,
    });

    try {
        await ds.initialize();

        // Use raw query to avoid entity mismatch issues
        const properties = await ds.query('SELECT id, name, description FROM properties');
        console.log(`Found ${properties.length} properties`);

        let hasRussian = 0;
        const toTranslate: any[] = [];

        properties.forEach((p: any) => {
            if (p.description && /[а-яА-Я]/.test(p.description)) {
                hasRussian++;
                toTranslate.push(p);
                if (hasRussian < 5) {
                    console.log(`Property: ${p.name} | RU: ${p.description.substring(0, 50)}...`);
                }
            }
        });

        console.log(`Properties with Russian text: ${hasRussian} / ${properties.length}`);

        await ds.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

listProperties();
