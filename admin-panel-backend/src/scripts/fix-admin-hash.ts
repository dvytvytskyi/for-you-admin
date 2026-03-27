import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import * as bcrypt from 'bcrypt';

async function fix() {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { email: 'admin@foryou-realestate.com' } });
    if (user) {
        const hash = await bcrypt.hash('REDACTED_PASSWORD', 10);
        user.passwordHash = hash;
        await repo.save(user);
        console.log('Admin password hash updated to:', hash);
    }
    await AppDataSource.destroy();
}
fix().catch(console.error);
