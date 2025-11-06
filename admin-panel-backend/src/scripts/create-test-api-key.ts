import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';
import * as crypto from 'crypto';

function generateApiKey(): string {
  return `ak_${crypto.randomBytes(32).toString('hex')}`;
}

function generateApiSecret(): string {
  return `as_${crypto.randomBytes(32).toString('hex')}`;
}

async function createTestApiKey() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const apiKeyRepo = AppDataSource.getRepository(ApiKey);

    // Перевіряємо, чи вже є активні ключі
    const existingKeys = await apiKeyRepo.find({
      where: { isActive: true },
    });

    if (existingKeys.length > 0) {
      console.log('📊 Існуючі активні API ключі:');
      existingKeys.forEach((key, index) => {
        console.log(`\n   ${index + 1}. ${key.name || 'Untitled'}`);
        console.log(`      API Key: ${key.apiKey}`);
        console.log(`      API Secret: ${key.apiSecret}`);
        console.log(`      Created: ${new Date(key.createdAt).toLocaleString()}`);
      });
      console.log('\n⚠️  Вже є активні ключі. Використовуйте існуючі або деактивуйте їх перед створенням нового.');
    } else {
      // Створюємо новий тестовий ключ
      const apiKey = generateApiKey();
      const apiSecret = generateApiSecret();

      const newKey = apiKeyRepo.create({
        apiKey,
        apiSecret,
        name: 'Test API Key',
        isActive: true,
      });

      const saved = await apiKeyRepo.save(newKey);

      console.log('✅ Створено новий тестовий API ключ:\n');
      console.log('   ┌─────────────────────────────────────────────────────────┐');
      console.log('   │ API Key (x-api-key):');
      console.log(`   │ ${saved.apiKey}`);
      console.log('   └─────────────────────────────────────────────────────────┘');
      console.log('\n   ┌─────────────────────────────────────────────────────────┐');
      console.log('   │ API Secret (x-api-secret):');
      console.log(`   │ ${saved.apiSecret}`);
      console.log('   └─────────────────────────────────────────────────────────┘');
      console.log('\n⚠️  ЗБЕРЕЖІТЬ ЦІ ЗНАЧЕННЯ! Вони показуються тільки один раз.');
      console.log('\n📝 Приклад використання:');
      console.log('   curl -H "x-api-key: ' + saved.apiKey + '" \\');
      console.log('        -H "x-api-secret: ' + saved.apiSecret + '" \\');
      console.log('        http://localhost:4000/api/properties?propertyType=secondary');
    }

    await AppDataSource.destroy();
    console.log('\n✅ Готово');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

createTestApiKey();

