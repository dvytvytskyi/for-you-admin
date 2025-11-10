import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';

/**
 * Тестовий скрипт для перевірки реальних ключів з продакшн
 */

const PRODUCTION_API_KEY = 'fyr_8f968d115244e76d209a26f5177c5c998aca0e8dbce4a6e9071b2bc43b78f6d2';
const PRODUCTION_API_SECRET = '5c8335f9c7e476cbe77454fd32532cc68f57baf86f7f96e6bafcf682f98b275bc579d73484cf5bada7f4cd7d071b122778b71f414fb96b741c5fe60394d1795f';

async function testProductionKeys() {
  try {
    console.log('🧪 Тестування продакшн ключів...\n');

    await AppDataSource.initialize();
    console.log('✅ Підключено до бази даних\n');

    const apiKeyRepo = AppDataSource.getRepository(ApiKey);

    console.log('📋 Тестові ключі:');
    console.log(`   API Key: ${PRODUCTION_API_KEY.substring(0, 40)}...`);
    console.log(`   API Secret: ${PRODUCTION_API_SECRET.substring(0, 40)}...\n`);

    // 1. Перевірка точного збігу ключа
    console.log('🔍 1. Пошук ключа в БД:');
    const exactKeyMatch = await apiKeyRepo.findOne({
      where: { apiKey: PRODUCTION_API_KEY },
    });

    if (exactKeyMatch) {
      console.log('   ✅ Ключ знайдено (точний збіг)');
      console.log(`      ID: ${exactKeyMatch.id}`);
      console.log(`      Назва: ${exactKeyMatch.name || 'Без назви'}`);
      console.log(`      Активний: ${exactKeyMatch.isActive ? '✅' : '❌'}`);
      console.log(`      Secret в БД: ${exactKeyMatch.apiSecret.substring(0, 40)}...`);
      console.log(`      Secret з тесту: ${PRODUCTION_API_SECRET.substring(0, 40)}...`);
      
      // Перевірка secret
      const secretMatch = exactKeyMatch.apiSecret === PRODUCTION_API_SECRET;
      console.log(`      Secret збігається: ${secretMatch ? '✅' : '❌'}`);
      
      if (!secretMatch) {
        console.log(`      Довжина Secret в БД: ${exactKeyMatch.apiSecret.length}`);
        console.log(`      Довжина Secret з тесту: ${PRODUCTION_API_SECRET.length}`);
        
        // Знайти першу відмінність
        for (let i = 0; i < Math.min(exactKeyMatch.apiSecret.length, PRODUCTION_API_SECRET.length); i++) {
          if (exactKeyMatch.apiSecret[i] !== PRODUCTION_API_SECRET[i]) {
            console.log(`      Перша відмінність на позиції ${i}:`);
            console.log(`         БД: '${exactKeyMatch.apiSecret[i]}' (${exactKeyMatch.apiSecret[i].charCodeAt(0)})`);
            console.log(`         Тест: '${PRODUCTION_API_SECRET[i]}' (${PRODUCTION_API_SECRET[i].charCodeAt(0)})`);
            break;
          }
        }
      } else {
        console.log('\n   ✅ ВСЕ ПРАВИЛЬНО! Ключ та secret збігаються!');
      }
    } else {
      console.log('   ❌ Ключ не знайдено в БД');
      console.log('   ⚠️  Потрібно імпортувати ключ на продакшн БД\n');
      
      // Показати всі доступні ключі
      const allKeys = await apiKeyRepo.find({
        take: 5,
        select: ['id', 'apiKey', 'name', 'isActive'],
      });
      
      if (allKeys.length > 0) {
        console.log('   Доступні ключі в БД (перші 5):');
        allKeys.forEach((key, index) => {
          console.log(`      ${index + 1}. ${key.name || 'Без назви'}`);
          console.log(`         ${key.apiKey.substring(0, 40)}...`);
          console.log(`         Активний: ${key.isActive ? '✅' : '❌'}`);
        });
      }
    }

    // 2. Симуляція middleware логіки
    console.log('\n🔍 2. Симуляція middleware логіки:');
    const trimmedApiKey = PRODUCTION_API_KEY.trim();
    const trimmedApiSecret = PRODUCTION_API_SECRET.trim();

    // Точний збіг
    let foundKey = await apiKeyRepo.findOne({
      where: { apiKey: trimmedApiKey },
    });

    if (!foundKey && trimmedApiKey.startsWith('fyr_')) {
      console.log('   ⚠️  Точний збіг не знайдено, але ключ має префікс fyr_');
      console.log('   ✅ Middleware знайде ключ (точний збіг з fyr_)');
    }

    if (foundKey) {
      console.log('   ✅ Middleware знайде ключ');
      
      // Перевірка secret
      let secretMatch = foundKey.apiSecret === trimmedApiSecret;
      
      if (!secretMatch && trimmedApiSecret.startsWith('as_')) {
        const secretWithoutPrefix = trimmedApiSecret.substring(3);
        secretMatch = foundKey.apiSecret === secretWithoutPrefix;
        if (secretMatch) {
          console.log('   ⚠️  Secret збігається після видалення префіксу as_');
        }
      }
      
      if (!secretMatch && foundKey.apiKey.startsWith('fyr_') && !trimmedApiSecret.startsWith('fyr_') && !trimmedApiSecret.startsWith('as_')) {
        const secretWithFyrPrefix = `fyr_${trimmedApiSecret}`;
        secretMatch = foundKey.apiSecret === secretWithFyrPrefix;
        if (secretMatch) {
          console.log('   ⚠️  Secret збігається після додавання префіксу fyr_');
        }
      }
      
      if (!secretMatch && trimmedApiSecret.startsWith('fyr_') && !foundKey.apiSecret.startsWith('fyr_')) {
        const secretWithoutFyrPrefix = trimmedApiSecret.substring(4);
        secretMatch = foundKey.apiSecret === secretWithoutFyrPrefix;
        if (secretMatch) {
          console.log('   ⚠️  Secret збігається після видалення префіксу fyr_');
        }
      }
      
      if (secretMatch) {
        console.log('   ✅ Middleware знайде secret');
        console.log('   ✅ Аутентифікація ПРОЙДЕ УСПІШНО');
      } else {
        console.log('   ❌ Middleware НЕ знайде secret');
        console.log('   ❌ Аутентифікація ПРОВАЛИТЬСЯ');
      }
    } else {
      console.log('   ❌ Middleware НЕ знайде ключ');
      console.log('   ❌ Аутентифікація ПРОВАЛИТЬСЯ');
    }

    // 3. Рекомендації
    console.log('\n💡 Рекомендації:');
    if (!exactKeyMatch) {
      console.log('   1. Імпортуйте ключ на продакшн БД');
      console.log('   2. Використайте SQL файл або скрипт для імпорту');
    } else if (exactKeyMatch.apiSecret !== PRODUCTION_API_SECRET) {
      console.log('   1. Secret не збігається - перевірте правильність secret');
      console.log('   2. Можливо, secret в БД має інший формат');
    } else if (!exactKeyMatch.isActive) {
      console.log('   1. Ключ неактивний - активуйте його');
    } else {
      console.log('   ✅ Все налаштовано правильно!');
      console.log('   ✅ Middleware має працювати з цими ключами');
    }

  } catch (error: any) {
    console.error('❌ Помилка:', error);
    console.error(error.stack);
  } finally {
    await AppDataSource.destroy();
    console.log('\n✅ З\'єднання закрито');
  }
}

testProductionKeys();

