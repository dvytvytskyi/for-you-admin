import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';
import * as path from 'path';

async function matchSecondaryPhotos() {
  try {
    console.log('🔄 Підключення до бази даних...');
    await AppDataSource.initialize();
    console.log('✅ База даних підключена');

    const propertyRepo = AppDataSource.getRepository(Property);

    // 1. Отримуємо всі Off-Plan проекти з фотографіями
    console.log('📖 Завантаження Off-Plan проектів...');
    const offPlanProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'photos']
    });

    // Створюємо Map для швидкого пошуку Off-Plan проекту за назвою (у нижньому регістрі)
    const offPlanMap = new Map<string, string[]>();
    offPlanProperties.forEach(op => {
      // Видаляємо зайві пробіли та переводимо в нижній регістр
      if (op.name) {
        const normalizedName = op.name.toLowerCase().trim();
        // Якщо є фото, додаємо їх в Map
        if (op.photos && op.photos.length > 0) {
          offPlanMap.set(normalizedName, op.photos);
        }
      }
    });

    console.log(`📊 Знайдено ${offPlanMap.size} Off-Plan проектів з фотографіями.`);

    // 2. Отримуємо всі Secondary об'єкти
    console.log('📖 Завантаження Secondary об\'єктів...');
    const secondaryProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.SECONDARY },
      select: ['id', 'name', 'buildingName', 'photos']
    });

    console.log(`📊 Знайдено ${secondaryProperties.length} Secondary об'єктів для аналізу.`);

    let matchedCount = 0;
    const unmatchedBuildings = new Set<string>();
    const savePromises: Promise<any>[] = [];

    // 3. Зіставлення Secondary -> Off-Plan
    for (const property of secondaryProperties) {
      if (!property.buildingName) {
        // Якщо немає buildingName, пробуємо взяти name, але це менш точно
        continue;
      }

      const normalizedBuildingName = property.buildingName.toLowerCase().trim();
      const offPlanPhotos = offPlanMap.get(normalizedBuildingName);

      if (offPlanPhotos && offPlanPhotos.length > 0) {
        // Знайшли збіг!
        // Об'єднуємо існуючі фото (якщо є) з новими фотографіями від Off-Plan
        const existingPhotos = property.photos || [];
        
        // Використовуємо Set, щоб уникнути дублікатів фото
        const combinedPhotosSet = new Set([...existingPhotos, ...offPlanPhotos]);
        const newPhotosArray = Array.from(combinedPhotosSet);

        // Оновлюємо, якщо щось реально додалося
        if (newPhotosArray.length > existingPhotos.length) {
          property.photos = newPhotosArray;
          
          savePromises.push(propertyRepo.save(property));
          matchedCount++;
        }
      } else {
        // Не знайшли збігу - записуємо назву будівлі
        unmatchedBuildings.add(property.buildingName.trim());
      }
    }

    // Зберігаємо змінені Secondary об'єкти в БД порціями
    console.log(`\n💾 Оновлення ${savePromises.length} Secondary об'єктів у базі...`);
    
    // Виконуємо збереження по 50 запитів паралельно, щоб не перевантажити базу
    const chunkSize = 50;
    for (let i = 0; i < savePromises.length; i += chunkSize) {
      const chunk = savePromises.slice(i, i + chunkSize);
      await Promise.all(chunk);
      process.stdout.write(`\r   Збережено: ${Math.min(i + chunkSize, savePromises.length)}/${savePromises.length}`);
    }
    console.log('\n✅ Оновлення бази даних завершено!');

    // 4. Записуємо "не знайдені" будівлі у JSON файл
    const unmatchedArray = Array.from(unmatchedBuildings).sort();
    const outputPath = path.resolve(__dirname, '../../../unmatched_buildings.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(unmatchedArray, null, 2));

    console.log('\n📈 ПІДСУМОК:');
    console.log(`   ✅ Успішно оновлено фото для: ${matchedCount} Secondary об'єктів`);
    console.log(`   ❌ Не знайдено Off-Plan для ${unmatchedArray.length} унікальних будівель.`);
    console.log(`   📁 Список не знайдених будівель збережено у файл: ${outputPath}`);

  } catch (error) {
    console.error('❌ Помилка під час зіставлення фотографій:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

matchSecondaryPhotos();
