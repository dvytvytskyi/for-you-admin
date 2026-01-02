import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function createUser() {
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

        const email = 'dvytvytskyi@gmail.com';
        const password = 'REDACTED_PASSWORD';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists first to be safe (though we know they don't from previous check)
        const existing = await ds.query(`SELECT * FROM users WHERE email = '${email}'`);
        if (existing.length > 0) {
            console.log('User already exists, updating password...');
            await ds.query(`UPDATE users SET password_hash = '${hashedPassword}', role = 'ADMIN', status = 'ACTIVE' WHERE email = '${email}'`);
        } else {
            console.log('Creating new user...');
            await ds.query(`
            INSERT INTO users (
                id, email, phone, password_hash, first_name, last_name, role, status, created_at, updated_at
            ) VALUES (
                uuid_generate_v4(), 
                '${email}', 
                '+380000000000', 
                '${hashedPassword}', 
                'Dima', 
                'Vytvytskyi', 
                'ADMIN', 
                'ACTIVE', 
                now(), 
                now()
            )
        `);
        }
        console.log('✅ User created/updated successfully.');

        await ds.destroy();
    } catch (err) {
        console.log('Error:', (err as any).message);
    }
}

createUser();
