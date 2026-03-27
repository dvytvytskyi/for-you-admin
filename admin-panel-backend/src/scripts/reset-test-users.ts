import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import * as bcrypt from 'bcrypt';

async function resetTestUsers() {
    await AppDataSource.initialize();

    const emails = [
        'infoinvestor@foryou-realestate.com',
        'infobroker@foryou-realestate.com',
        'maksinvestor@foryou-realestate.com',
        'maksbroker@foryou-realestate.com',
        'anastasiainvestor@foryou-realestate.com',
        'anastasiabroker@foryou-realestate.com',
        'dvytvytskyi@gmail.com'
    ];

    const newPassword = 'REDACTED_PASSWORD';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    console.log(`Resetting passwords for ${emails.length} users to: ${newPassword}`);

    for (const email of emails) {
        const result = await AppDataSource.getRepository(User).update(
            { email },
            { passwordHash }
        );
        console.log(`User ${email}: ${result.affected ? 'Updated' : 'Not found'}`);
    }

    await AppDataSource.destroy();
}

resetTestUsers().catch(console.error);
