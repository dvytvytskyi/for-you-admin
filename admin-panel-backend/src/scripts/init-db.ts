import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../entities/User';
import { Collection } from '../entities/Collection';
import { Property } from '../entities/Property';
// Import other entities as needed for full schema, or import all from index
import { entities } from '../entities';

async function init() {
    const ds = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 5435,
        username: 'admin',
        password: 'admin123',
        database: 'admin_panel',
        synchronize: true, // Key: create tables
        logging: true,
        entities: entities, // Use all entities
    });

    try {
        console.log('Initializing DB and creating tables...');
        await ds.initialize();
        console.log('✅ Tables created.');

        const email = 'dvytvytskyi@gmail.com';
        const existing = await ds.getRepository(User).findOne({ where: { email } });

        if (!existing) {
            console.log('Creating user...');
            const passwordHash = await bcrypt.hash('ForYou2025!', 10);
            const user = ds.getRepository(User).create({
                email,
                phone: '+34662636210',
                passwordHash,
                firstName: 'Dima',
                lastName: 'Vytv',
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
            });
            await ds.getRepository(User).save(user);
            console.log('✅ User created.');
        } else {
            console.log('User already exists.');
        }

        await ds.destroy();
    } catch (err) {
        console.error('Error:', err);
    }
}

init();
