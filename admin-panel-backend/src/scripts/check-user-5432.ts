import { DataSource } from 'typeorm';

async function verify() {
    // Check port 5432 (Old DB / or potentially the one being used)
    const ds = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 5432,
        username: 'postgres',
        password: 'postgres',
        database: 'for_you_real_estate',
        synchronize: false,
        logging: false,
    });

    try {
        await ds.initialize();
        console.log('Connected to for_you_real_estate (5432).');

        const result = await ds.query(`SELECT * FROM information_schema.tables WHERE table_name = 'users'`);
        if (result.length > 0) {
            console.log('✅ Table "users" EXISTS!');
            const all = await ds.query(`SELECT email FROM users`);
            console.log('All user emails:', all.map((u: any) => u.email));
        } else {
            console.log('❌ Table "users" does NOT exist in 5432.');
        }

        await ds.destroy();
    } catch (err) {
        console.log('Connection failed to 5432:', (err as any).message);
    }
}

verify();
