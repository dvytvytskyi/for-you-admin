
import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { entities } from '../entities';

async function check() {
    console.log('Checking 5436 (admin-pro-part-postgres)...');
    const ds = new DataSource({
        type: 'postgres',
        url: 'postgresql://admin:admin123@localhost:5436/admin_panel', // Guessing DB name often matches or is 'postgres'
        entities: entities,
        synchronize: false,
        logging: false
    });

    try {
        await ds.initialize();
        console.log('Connected to 5436!');
        const user = await ds.getRepository(User).findOne({ where: { email: 'short@gmail.com' } });
        if (user) {
            console.log('✅ Found user in 5436!');
        } else {
            console.log('❌ User not found in 5436.');
        }
        await ds.destroy();
    } catch (err: any) {
        console.log(`❌ Failed: ${err.message}`);

        // Try 'postgres' db name if admin_panel failed
        console.log('Retrying with db name "postgres"...');
        const ds2 = new DataSource({
            type: 'postgres',
            url: 'postgresql://admin:admin123@localhost:5436/postgres',
            entities: entities,
            synchronize: false,
            logging: false
        });
        try {
            await ds2.initialize();
            console.log('Connected to 5436/postgres!');
            const user = await ds2.getRepository(User).findOne({ where: { email: 'short@gmail.com' } });
            if (user) {
                console.log('✅ Found user in 5436/postgres!');
            } else {
                console.log('❌ User not found in 5436/postgres.');
            }
            await ds2.destroy();
        } catch (err2: any) {
            console.log(`❌ Failed: ${err2.message}`);
        }
    }
}
check();
