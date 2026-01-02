import { DataSource } from 'typeorm';
import { Developer } from '../entities/Developer';
import { entities } from '../entities';

async function listDevelopers() {
    const ds = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'admin_panel_propart',
        entities: entities,
        synchronize: false,
        logging: false,
    });

    try {
        await ds.initialize();
        const developers = await ds.getRepository(Developer).find();

        let count = 0;
        developers.forEach(dev => {
            const desc = dev.description as any;
            const ru = desc?.ru?.description?.trim();
            const en = desc?.en?.description?.trim();

            if (ru && ru.length > 0 && (!en || en.length < 5)) {
                count++;
                console.log(`Needs translation: ${dev.name}`);
            }
        });

        console.log(`Total needs: ${count}`);

        await ds.destroy();
    } catch (error) {
        console.error('Error:', error);
    }
}

listDevelopers();
