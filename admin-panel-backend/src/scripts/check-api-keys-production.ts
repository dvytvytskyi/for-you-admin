import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';

async function checkApiKeys() {
  try {
    console.log('🔍 Перевірка API ключів в базі даних...\n');

    await AppDataSource.initialize();
    console.log('✅ Підключено до бази даних\n');

    const apiKeyRepo = AppDataSource.getRepository(ApiKey);

    // 1. Перевірка всіх ключів
    console.log('📊 1. Всі API ключі в базі:');
    const allKeys = await apiKeyRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (allKeys.length === 0) {
      console.log('   ❌ В базі немає жодного API ключа!\n');
    } else {
      console.log(`   Знайдено ключів: ${allKeys.length}\n`);
      allKeys.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.name || 'Без назви'}`);
        console.log(`      ID: ${key.id}`);
        console.log(`      API Key: ${key.apiKey.substring(0, 30)}... (довжина: ${key.apiKey.length})`);
        console.log(`      API Secret: ${key.apiSecret.substring(0, 30)}... (довжина: ${key.apiSecret.length})`);
        console.log(`      Активний: ${key.isActive ? '✅' : '❌'}`);
        console.log(`      Створено: ${key.createdAt}`);
        console.log(`      Останнє використання: ${key.lastUsedAt || 'Ніколи'}`);
        console.log('');
      });
    }

    // 2. Перевірка конкретного ключа з запиту
    const testApiKey = 'ak_aa4d19418b385c370939b45365d0c687ddbdef7cbe9a72548748ef67f5e469e1';
    const testApiSecret = 'as_623caef2632983630ce11293e544504c834a9ab1015fa2c75a7c2583d6f28d7c';

    console.log('🔍 2. Перевірка тестового ключа з запиту:');
    console.log(`   API Key: ${testApiKey}`);
    console.log(`   API Secret: ${testApiSecret.substring(0, 30)}...\n`);

    // Перевірка точного збігу
    const exactMatch = await apiKeyRepo.findOne({
      where: { apiKey: testApiKey },
    });

    if (exactMatch) {
      console.log('   ✅ Знайдено точний збіг!');
      console.log(`      ID: ${exactMatch.id}`);
      console.log(`      Назва: ${exactMatch.name || 'Без назви'}`);
      console.log(`      Активний: ${exactMatch.isActive ? '✅' : '❌'}`);
      console.log(`      Secret в БД: ${exactMatch.apiSecret.substring(0, 30)}...`);
      console.log(`      Secret з запиту: ${testApiSecret.substring(0, 30)}...`);
      console.log(`      Secret збігається: ${exactMatch.apiSecret === testApiSecret ? '✅' : '❌'}`);
      if (exactMatch.apiSecret !== testApiSecret) {
        console.log(`      Довжина Secret в БД: ${exactMatch.apiSecret.length}`);
        console.log(`      Довжина Secret з запиту: ${testApiSecret.length}`);
        // Знайти першу відмінність
        for (let i = 0; i < Math.min(exactMatch.apiSecret.length, testApiSecret.length); i++) {
          if (exactMatch.apiSecret[i] !== testApiSecret[i]) {
            console.log(`      Перша відмінність на позиції ${i}:`);
            console.log(`         БД: '${exactMatch.apiSecret[i]}' (${exactMatch.apiSecret[i].charCodeAt(0)})`);
            console.log(`         Запит: '${testApiSecret[i]}' (${testApiSecret[i].charCodeAt(0)})`);
            break;
          }
        }
      }
    } else {
      console.log('   ❌ Точний збіг не знайдено\n');

      // Перевірка без префіксу ak_
      const keyWithoutPrefix = testApiKey.substring(3);
      const matchWithoutPrefix = await apiKeyRepo.findOne({
        where: { apiKey: keyWithoutPrefix },
      });

      if (matchWithoutPrefix) {
        console.log('   ⚠️ Знайдено ключ без префіксу ak_');
        console.log(`      ID: ${matchWithoutPrefix.id}`);
        console.log(`      API Key в БД: ${matchWithoutPrefix.apiKey.substring(0, 30)}...`);
      } else {
        console.log('   ❌ Ключ без префіксу також не знайдено');
      }

      // Перевірка з префіксом fyr_
      const keyWithFyrPrefix = `fyr_${testApiKey.replace(/^(ak_|fyr_)/, '')}`;
      const matchWithFyrPrefix = await apiKeyRepo.findOne({
        where: { apiKey: keyWithFyrPrefix },
      });

      if (matchWithFyrPrefix) {
        console.log('   ⚠️ Знайдено ключ з префіксом fyr_');
        console.log(`      ID: ${matchWithFyrPrefix.id}`);
        console.log(`      API Key в БД: ${matchWithFyrPrefix.apiKey.substring(0, 30)}...`);
      } else {
        console.log('   ❌ Ключ з префіксом fyr_ також не знайдено');
      }
    }

    // 3. Статистика по префіксах
    console.log('\n📊 3. Статистика по префіксах ключів:');
    const prefixStats: { [prefix: string]: number } = {};
    allKeys.forEach(key => {
      let prefix = 'без префіксу';
      if (key.apiKey.startsWith('ak_')) prefix = 'ak_';
      else if (key.apiKey.startsWith('fyr_')) prefix = 'fyr_';
      else if (key.apiKey.length > 0) prefix = key.apiKey.substring(0, 3) + '_';
      prefixStats[prefix] = (prefixStats[prefix] || 0) + 1;
    });
    Object.entries(prefixStats).forEach(([prefix, count]) => {
      console.log(`   ${prefix}: ${count} ключів`);
    });

    // 4. Активні ключі
    console.log('\n📊 4. Активні ключі:');
    const activeKeys = allKeys.filter(k => k.isActive);
    console.log(`   Активних: ${activeKeys.length} з ${allKeys.length}`);
    if (activeKeys.length === 0) {
      console.log('   ⚠️ УВАГА: Немає активних ключів!');
    }

    // 5. Рекомендації
    console.log('\n💡 Рекомендації:');
    if (allKeys.length === 0) {
      console.log('   1. Створіть новий API ключ через адмін-панель або скрипт');
    } else if (!exactMatch) {
      console.log('   1. Ключ з запиту не знайдено в БД');
      console.log('   2. Можливо, ключі в БД мають інший формат (fyr_ замість ak_)');
      console.log('   3. Створіть новий ключ з правильним форматом або оновіть існуючий');
    } else if (!exactMatch.isActive) {
      console.log('   1. Ключ знайдено, але він неактивний');
      console.log('   2. Активуйте ключ через адмін-панель');
    } else if (exactMatch.apiSecret !== testApiSecret) {
      console.log('   1. Ключ знайдено і активний, але secret не збігається');
      console.log('   2. Перевірте правильність secret в запиті');
      console.log('   3. Можливо, secret зберігається з префіксом as_ в БД');
    } else {
      console.log('   ✅ Все виглядає правильно!');
    }

  } catch (error: any) {
    console.error('❌ Помилка:', error);
    console.error(error.stack);
  } finally {
    await AppDataSource.destroy();
    console.log('\n✅ З\'єднання закрито');
  }
}

checkApiKeys();

