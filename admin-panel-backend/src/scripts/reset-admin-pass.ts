import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import bcrypt from 'bcrypt';

async function resetAdminPassword() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const userRepository = AppDataSource.getRepository(User);
        const adminEmail = 'admin@foryou-realestate.com';
        const user = await userRepository.findOne({ where: { email: adminEmail } });

        if (user) {
            const password = 'REDACTED_PASSWORD';
            const hash = await bcrypt.hash(password, 10);
            user.passwordHash = hash;
            await userRepository.save(user);
            console.log(`✅ Password for ${adminEmail} has been reset to REDACTED_PASSWORD`);
        } else {
            console.log(`❌ User ${adminEmail} not found`);
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error resetting password:', error);
    }
}

resetAdminPassword();
