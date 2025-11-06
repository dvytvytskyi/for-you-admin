import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';

async function checkApiKeysDetail() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const apiKeyRepo = AppDataSource.getRepository(ApiKey);

    // Перевіряємо всі ключі (активні та неактивні)
    const allKeys = await apiKeyRepo.find({
      order: { createdAt: 'DESC' },
    });

    console.log('📊 Всі API ключі в БД:');
    console.log(`   Всього: ${allKeys.length}\n`);

    if (allKeys.length === 0) {
      console.log('   ⚠️  Немає ключів в БД!');
      await AppDataSource.destroy();
      process.exit(0);
    }

    allKeys.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key.name || 'Untitled'}`);
      console.log(`      ID: ${key.id}`);
      console.log(`      API Key: ${key.apiKey}`);
      console.log(`      API Secret: ${key.apiSecret}`);
      console.log(`      Active: ${key.isActive}`);
      console.log(`      Last Used: ${key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}`);
      console.log(`      Created: ${new Date(key.createdAt).toLocaleString()}`);
      console.log(`      Updated: ${new Date(key.updatedAt).toLocaleString()}`);
      console.log('');
    });

    // Перевіряємо конкретний ключ
    const testKey = 'ak_aa4d19418b385c370939b45365d0c687ddbdef7cbe9a72548748ef67f5e469e1';
    const testSecret = 'as_623caef2632983630ce11293e544504c834a9ab1015fa2c75a7c2583d6f28d7c';

    console.log('🔍 Перевірка конкретного ключа:');
    console.log(`   API Key: ${testKey}`);
    console.log(`   API Secret: ${testSecret.substring(0, 20)}...\n`);

    const foundKey = await apiKeyRepo.findOne({
      where: { apiKey: testKey },
    });

    if (!foundKey) {
      console.log('   ❌ Ключ НЕ знайдено в БД!');
    } else {
      console.log('   ✅ Ключ знайдено в БД');
      console.log(`      ID: ${foundKey.id}`);
      console.log(`      Active: ${foundKey.isActive}`);
      console.log(`      Secret match: ${foundKey.apiSecret === testSecret ? '✅' : '❌'}`);
      
      if (foundKey.apiSecret !== testSecret) {
        console.log(`      Expected: ${testSecret}`);
        console.log(`      Actual: ${foundKey.apiSecret}`);
        console.log(`      Length match: ${foundKey.apiSecret.length === testSecret.length ? '✅' : '❌'}`);
        console.log(`      Expected length: ${testSecret.length}`);
        console.log(`      Actual length: ${foundKey.apiSecret.length}`);
      }
    }

    // Перевіряємо пошук з isActive
    const activeKey = await apiKeyRepo.findOne({
      where: { apiKey: testKey, apiSecret: testSecret, isActive: true },
    });

    console.log('\n🔍 Перевірка активного ключа (з secret):');
    if (activeKey) {
      console.log('   ✅ Активний ключ знайдено!');
    } else {
      console.log('   ❌ Активний ключ НЕ знайдено!');
      console.log('   Можливі причини:');
      console.log('      - Ключ не активний (isActive = false)');
      console.log('      - Secret не співпадає');
      console.log('      - Ключ не існує');
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

checkApiKeysDetail();

