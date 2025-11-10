import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';
import * as readline from 'readline';

/**
 * Скрипт для синхронізації API ключів з локальної БД на продакшн
 * 
 * ВАЖЛИВО: Перед використанням переконайтеся, що:
 * 1. У .env вказані правильні дані для продакшн БД
 * 2. Ви маєте доступ до продакшн БД
 * 3. Ви розумієте, що цей скрипт може перезаписати дані в продакшн БД
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function syncApiKeys() {
  try {
    console.log('🔄 Синхронізація API ключів на продакшн...\n');
    console.log('⚠️  УВАГА: Цей скрипт синхронізує ключі з локальної БД на продакшн!\n');

    const confirm = await question('Продовжити? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Скасовано');
      rl.close();
      return;
    }

    await AppDataSource.initialize();
    console.log('✅ Підключено до локальної бази даних\n');

    const apiKeyRepo = AppDataSource.getRepository(ApiKey);

    // Отримати всі активні ключі з локальної БД
    const localKeys = await apiKeyRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (localKeys.length === 0) {
      console.log('❌ В локальній БД немає активних ключів!');
      rl.close();
      await AppDataSource.destroy();
      return;
    }

    console.log(`📊 Знайдено ${localKeys.length} активних ключів в локальній БД:\n`);
    localKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.name || 'Без назви'}`);
      console.log(`      API Key: ${key.apiKey.substring(0, 30)}...`);
      console.log(`      API Secret: ${key.apiSecret.substring(0, 30)}...`);
      console.log(`      Створено: ${key.createdAt}`);
      console.log('');
    });

    console.log('\n📋 Інструкції для синхронізації на продакшн:\n');
    console.log('1. Підключіться до продакшн БД через psql або інший клієнт');
    console.log('2. Виконайте наступні SQL команди:\n');

    localKeys.forEach((key, index) => {
      console.log(`-- Ключ ${index + 1}: ${key.name || 'Без назви'}`);
      console.log(`INSERT INTO api_keys (id, api_key, api_secret, name, is_active, created_at, updated_at)`);
      console.log(`VALUES (`);
      console.log(`  '${key.id}',`);
      console.log(`  '${key.apiKey}',`);
      console.log(`  '${key.apiSecret}',`);
      console.log(`  '${key.name || 'Untitled API Key'}',`);
      console.log(`  ${key.isActive},`);
      console.log(`  '${key.createdAt.toISOString()}',`);
      console.log(`  '${key.updatedAt.toISOString()}'`);
      console.log(`)`);
      console.log(`ON CONFLICT (api_key) DO UPDATE SET`);
      console.log(`  api_secret = EXCLUDED.api_secret,`);
      console.log(`  name = EXCLUDED.name,`);
      console.log(`  is_active = EXCLUDED.is_active,`);
      console.log(`  updated_at = EXCLUDED.updated_at;`);
      console.log('');
    });

    console.log('\nАБО використайте цей скрипт для автоматичної синхронізації:');
    console.log('(потрібно налаштувати DATABASE_URL для продакшн БД в .env.production)\n');

    // Альтернатива: автоматична синхронізація (якщо налаштовано продакшн БД)
    const useAutoSync = await question('Виконати автоматичну синхронізацію? (yes/no): ');
    
    if (useAutoSync.toLowerCase() === 'yes') {
      const prodDbUrl = process.env.DATABASE_URL_PRODUCTION || process.env.DATABASE_URL;
      
      if (!prodDbUrl || prodDbUrl.includes('localhost')) {
        console.log('❌ DATABASE_URL_PRODUCTION не налаштовано або вказує на localhost');
        console.log('   Налаштуйте змінну оточення DATABASE_URL_PRODUCTION для продакшн БД');
        rl.close();
        await AppDataSource.destroy();
        return;
      }

      console.log('⚠️  Автоматична синхронізація потребує окремого підключення до продакшн БД');
      console.log('   Ця функція не реалізована в цьому скрипті');
      console.log('   Використайте SQL команди вище або налаштуйте окреме підключення\n');
    }

    console.log('✅ Готово! Використайте SQL команди вище для синхронізації');

  } catch (error: any) {
    console.error('❌ Помилка:', error);
    console.error(error.stack);
  } finally {
    rl.close();
    await AppDataSource.destroy();
    console.log('\n✅ З\'єднання закрито');
  }
}

syncApiKeys();

