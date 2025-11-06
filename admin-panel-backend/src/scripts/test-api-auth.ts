import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';

async function testApiAuth() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const apiKeyRepo = AppDataSource.getRepository(ApiKey);

    // Перевіряємо активні API ключі
    const activeKeys = await apiKeyRepo.find({
      where: { isActive: true },
    });

    console.log('📊 Активні API ключі:');
    if (activeKeys.length === 0) {
      console.log('   ⚠️  Немає активних API ключів!');
      console.log('   Створіть API ключ через адмін панель або API endpoint.');
    } else {
      activeKeys.forEach((key, index) => {
        console.log(`\n   ${index + 1}. ${key.name || 'Untitled'}`);
        console.log(`      API Key: ${key.apiKey.substring(0, 20)}...`);
        console.log(`      API Secret: ${key.apiSecret.substring(0, 20)}...`);
        console.log(`      Active: ${key.isActive}`);
        console.log(`      Last Used: ${key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}`);
        console.log(`      Created: ${new Date(key.createdAt).toLocaleString()}`);
      });
    }

    await AppDataSource.destroy();
    console.log('\n✅ Перевірка завершена');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

testApiAuth();

