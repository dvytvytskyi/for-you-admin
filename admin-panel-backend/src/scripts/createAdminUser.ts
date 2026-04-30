import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../entities/User';
import bcrypt from 'bcrypt';

async function createAdminUser() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const userRepository = AppDataSource.getRepository(User);
    
    // Створюємо обох адміністраторів (з env та з документації)
    const pass1 = process.env.ADMIN_PASS_1;
    const pass2 = process.env.ADMIN_PASS_2;
    if (!pass1 || !pass2) {
      console.error('❌ Set ADMIN_PASS_1 and ADMIN_PASS_2 env vars before running this script.');
      process.exit(1);
    }
    const admins = [
      { email: 'admin@foryou.ae', password: pass1 },
      { email: 'admin@foryou-realestate.com', password: pass2 },
    ];

    for (const admin of admins) {
      // Перевіряємо чи користувач вже існує
      let user = await userRepository.findOne({
        where: { email: admin.email },
      });

      // Хешуємо пароль
      const passwordHash = await bcrypt.hash(admin.password, 10);

      if (user) {
        // Оновлюємо існуючого користувача
        console.log(`📝 Оновлюємо адміністратора ${admin.email}...`);
        user.passwordHash = passwordHash;
        user.role = UserRole.ADMIN;
        user.status = UserStatus.ACTIVE;
        await userRepository.save(user);
        console.log(`✅ Адміністратор ${admin.email} оновлено!`);
      } else {
        // Створюємо нового користувача
        console.log(`📝 Створюємо адміністратора ${admin.email}...`);
        user = userRepository.create({
          email: admin.email,
          phone: `+380${Math.random().toString().slice(2, 10)}`, // Унікальний телефон
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        });
        await userRepository.save(user);
        console.log(`✅ Адміністратор ${admin.email} створено!`);
      }
    }

    console.log('');
    console.log('✅ ALL ADMINS READY. Check email/credentials in your secure vault.');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

createAdminUser();
