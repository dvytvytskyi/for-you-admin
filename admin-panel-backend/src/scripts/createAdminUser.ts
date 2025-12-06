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
    const admins = [
      {
        email: 'admin@foryou.ae',
        password: 'admin123', // Пароль з .env
      },
      {
        email: 'admin@foryou-realestate.com',
        password: '6BDmw7i8WJNzKqJb', // Пароль з документації
      }
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
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ВСІ АДМІНІСТРАТОРИ ГОТОВІ!');
    console.log('');
    console.log('📧 Дані для входу:');
    console.log('   1. Email: admin@foryou.ae');
    console.log('      Password: admin123');
    console.log('');
    console.log('   2. Email: admin@foryou-realestate.com');
    console.log('      Password: 6BDmw7i8WJNzKqJb');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

createAdminUser();
