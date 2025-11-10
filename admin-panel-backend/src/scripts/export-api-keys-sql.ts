import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Скрипт для експорту API ключів у SQL файл для імпорту на продакшн
 */

async function exportApiKeysToSQL() {
  try {
    console.log('📤 Експорт API ключів у SQL файл...\n');

    await AppDataSource.initialize();
    console.log('✅ Підключено до бази даних\n');

    const apiKeyRepo = AppDataSource.getRepository(ApiKey);

    // Отримати всі ключі
    const allKeys = await apiKeyRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (allKeys.length === 0) {
      console.log('❌ В БД немає API ключів!');
      await AppDataSource.destroy();
      return;
    }

    console.log(`📊 Знайдено ${allKeys.length} ключів\n`);

    // Генерація SQL
    let sql = `-- API Keys Export\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- Total keys: ${allKeys.length}\n\n`;

    sql += `-- Увага: Цей скрипт використовує ON CONFLICT для оновлення існуючих ключів\n`;
    sql += `-- Якщо ключ з таким api_key вже існує, він буде оновлено\n\n`;

    allKeys.forEach((key, index) => {
      sql += `-- Key ${index + 1}: ${key.name || 'Untitled'}\n`;
      sql += `INSERT INTO api_keys (id, api_key, api_secret, name, is_active, created_at, updated_at, last_used_at)\n`;
      sql += `VALUES (\n`;
      sql += `  '${key.id}'::uuid,\n`;
      sql += `  '${key.apiKey.replace(/'/g, "''")}',\n`; // Escape single quotes
      sql += `  '${key.apiSecret.replace(/'/g, "''")}',\n`;
      sql += `  '${(key.name || 'Untitled API Key').replace(/'/g, "''")}',\n`;
      sql += `  ${key.isActive},\n`;
      sql += `  '${key.createdAt.toISOString()}',\n`;
      sql += `  '${key.updatedAt.toISOString()}',\n`;
      sql += `  ${key.lastUsedAt ? `'${key.lastUsedAt.toISOString()}'` : 'NULL'}\n`;
      sql += `)\n`;
      sql += `ON CONFLICT (api_key) DO UPDATE SET\n`;
      sql += `  api_secret = EXCLUDED.api_secret,\n`;
      sql += `  name = EXCLUDED.name,\n`;
      sql += `  is_active = EXCLUDED.is_active,\n`;
      sql += `  updated_at = EXCLUDED.updated_at,\n`;
      sql += `  last_used_at = COALESCE(EXCLUDED.last_used_at, api_keys.last_used_at);\n\n`;
    });

    // Збереження у файл
    const outputPath = path.join(__dirname, '../../api-keys-export.sql');
    fs.writeFileSync(outputPath, sql, 'utf8');

    console.log(`✅ SQL файл створено: ${outputPath}`);
    console.log(`   Розмір: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    console.log(`   Ключів: ${allKeys.length}\n`);

    console.log('📋 Наступні кроки:');
    console.log('   1. Скопіюйте файл api-keys-export.sql на продакшн сервер');
    console.log('   2. Підключіться до продакшн БД:');
    console.log('      psql -h <host> -U <user> -d <database>');
    console.log('   3. Виконайте SQL файл:');
    console.log('      \\i api-keys-export.sql');
    console.log('   4. Або через командний рядок:');
    console.log('      psql -h <host> -U <user> -d <database> -f api-keys-export.sql\n');

    // Також вивести короткий варіант для одного ключа
    const activeKeys = allKeys.filter(k => k.isActive);
    if (activeKeys.length > 0) {
      const mainKey = activeKeys[0];
      console.log('🔑 Основний активний ключ (для швидкого тестування):');
      console.log(`   API Key: ${mainKey.apiKey}`);
      console.log(`   API Secret: ${mainKey.apiSecret}\n`);
    }

  } catch (error: any) {
    console.error('❌ Помилка:', error);
    console.error(error.stack);
  } finally {
    await AppDataSource.destroy();
    console.log('✅ З\'єднання закрито');
  }
}

exportApiKeysToSQL();

