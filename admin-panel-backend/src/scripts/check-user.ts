import { DataSource } from 'typeorm';

async function verify() {
    const ds = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 5435,
        username: 'admin',
        password: 'admin123',
        database: 'admin_panel',
        synchronize: false,
        logging: false,
    });

    try {
        await ds.initialize();
        console.log('Connected to admin_panel.');

        const result = await ds.query(`SELECT * FROM information_schema.tables WHERE table_name = 'users'`);
        if (result.length > 0) {
            console.log('✅ Table "users" EXISTS!');
            const rows = await ds.query(`SELECT * FROM users WHERE email = 'dvytvytskyi@gmail.com'`);
            console.log(`Found ${rows.length} users with email dvytvytskyi@gmail.com.`);
            if (rows.length > 0) {
                console.log('User ID:', rows[0].id);
                console.log('User Role:', rows[0].role);
                console.log('User Password Hash:', rows[0].password_hash ? 'Present' : 'Missing');
            } else {
                // Check all users
                const all = await ds.query(`SELECT email FROM users`);
                console.log('All user emails:', all.map((u: any) => u.email));
            }
        } else {
            console.log('❌ Table "users" does NOT exist.');
        }

        await ds.destroy();
    } catch (err) {
        console.log('Connection failed:', (err as any).message);
    }
}

verify();
