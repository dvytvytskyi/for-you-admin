import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

async function checkUsers() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const userRepository = AppDataSource.getRepository(User);
        const users = await userRepository.find();

        console.log('Users in database:', users.length);
        users.forEach(u => {
            console.log(`- ${u.email} (${u.role}, status: ${u.status})`);
        });

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error checking users:', error);
    }
}

checkUsers();
