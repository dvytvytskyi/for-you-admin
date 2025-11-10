import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';
import crypto from 'crypto';

async function createApiKeyWithPrefixes() {
  try {
    console.log('🔑 Створення API ключа з префіксами ak_ та as_...\n');

    await AppDataSource.initialize();
    console.log('✅ Підключено до бази даних\n');

    const apiKeyRepo = AppDataSource.getRepository(ApiKey);

    // Генерація ключів з префіксами
    const generateApiKey = () => {
      return `ak_${crypto.randomBytes(32).toString('hex')}`;
    };

    const generateApiSecret = () => {
      return `as_${crypto.randomBytes(32).toString('hex')}`;
    };

    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();

    console.log('📝 Створюю новий API ключ:');
    console.log(`   API Key: ${apiKey}`);
    console.log(`   API Secret: ${apiSecret}\n`);

    // Перевірка на дублікати
    const existingKey = await apiKeyRepo.findOne({
      where: { apiKey },
    });

    if (existingKey) {
      console.log('❌ Ключ з таким значенням вже існує!');
      return;
    }

    // Створення нового ключа
    const newApiKey = apiKeyRepo.create({
      apiKey,
      apiSecret,
      name: 'Production API Key (ak_/as_ format)',
      isActive: true,
    });

    const saved = await apiKeyRepo.save(newApiKey);

    console.log('✅ API ключ успішно створено!');
    console.log(`   ID: ${saved.id}`);
    console.log(`   Назва: ${saved.name}`);
    console.log(`   API Key: ${saved.apiKey}`);
    console.log(`   API Secret: ${saved.apiSecret}`);
    console.log(`   Активний: ${saved.isActive ? '✅' : '❌'}`);
    console.log(`   Створено: ${saved.createdAt}\n`);

    console.log('📋 Використання:');
    console.log(`   curl -H "x-api-key: ${saved.apiKey}" \\`);
    console.log(`        -H "x-api-secret: ${saved.apiSecret}" \\`);
    console.log(`        https://admin.foryou-realestate.com/api/public/data`);

  } catch (error: any) {
    console.error('❌ Помилка:', error);
    console.error(error.stack);
  } finally {
    await AppDataSource.destroy();
    console.log('\n✅ З\'єднання закрито');
  }
}

createApiKeyWithPrefixes();

