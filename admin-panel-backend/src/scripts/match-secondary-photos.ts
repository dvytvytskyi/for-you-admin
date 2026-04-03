import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Utility to parse photos string into array
 */
function parsePhotos(photos: any): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos;
  if (typeof photos === 'string') {
    // Handle both JSON-like arrays and comma-separated strings
    if (photos.startsWith('[') && photos.endsWith(']')) {
      try {
        return JSON.parse(photos);
      } catch (e) {
        // Fallback for malformed JSON
        return photos.slice(1, -1).split(',').map(p => p.trim().replace(/^"|"$/g, '')).filter(p => !!p);
      }
    }
    return photos.split(',').map(p => p.trim()).filter(p => !!p);
  }
  return [];
}

/**
 * Utility to normalize names for better matching
 * Removes common words and punctuation
 */
function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b(the|tower|towers|residence|residences|building|apartments|villa|villas|hotel|tower[\s]?a|tower[\s]?b|tower[\s]?c|tower[\s]?d|tower[\s]?1|tower[\s]?2|tower[\s]?3|tower[\s]?4|tower[\s]?5)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function matchSecondaryPhotos() {
  try {
    console.log('🔄 Підключення до бази даних...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ База даних підключена');

    const propertyRepo = AppDataSource.getRepository(Property);

    // 1. Отримуємо всі Off-Plan проекти з фотографіями
    console.log('📖 Завантаження Off-Plan проектів...');
    const offPlanProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'photos']
    });

    // Створюємо Map для швидкого пошуку Off-Plan проекту за нормалізованою назвою
    const offPlanMap = new Map<string, string[]>();
    offPlanProperties.forEach(op => {
      const photos = parsePhotos(op.photos);
      if (op.name && photos.length > 0) {
        const normalizedName = normalizeName(op.name);
        if (normalizedName) {
          // Якщо вже є такий ключ, зберігаємо той де більше фото
          const existing = offPlanMap.get(normalizedName);
          if (!existing || photos.length > existing.length) {
            offPlanMap.set(normalizedName, photos);
          }
        }
      }
    });

    console.log(`📊 Готово до зіставлення з ${offPlanMap.size} унікальними Off-Plan проектами.`);

    // 2. Отримуємо всі Secondary об'єкти
    console.log('📖 Завантаження Secondary об\'єктів...');
    const secondaryProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.SECONDARY },
      select: ['id', 'name', 'buildingName', 'photos']
    });

    console.log(`📊 Знайдено ${secondaryProperties.length} Secondary об'єктів для аналізу.`);

    let matchedCount = 0;
    const unmatchedBuildings = new Set<string>();
    const toUpdate: Property[] = [];

    // 3. Зіставлення Secondary -> Off-Plan
    for (const property of secondaryProperties) {
      const existingPhotos = parsePhotos(property.photos);
      
      // Шукаємо збіг спочатку по buildingName, потім по name
      const nameToMatch = property.buildingName || property.name;
      if (!nameToMatch) continue;

      const normName = normalizeName(nameToMatch);
      const offPlanPhotos = offPlanMap.get(normName);

      if (offPlanPhotos && offPlanPhotos.length > 0) {
        // Знайшли збіг!
        const combinedPhotosSet = new Set([...existingPhotos, ...offPlanPhotos]);
        const newPhotosArray = Array.from(combinedPhotosSet);

        // Оновлюємо, якщо реально щось додалося
        if (newPhotosArray.length > existingPhotos.length) {
          // Зберігаємо назад як кому-сепарований рядок, бо колонка в БД - text
          property.photos = newPhotosArray.join(',') as any; 
          toUpdate.push(property);
          matchedCount++;
        }
      } else if (property.buildingName) {
        unmatchedBuildings.add(property.buildingName.trim());
      }
    }

    // Зберігаємо зміни порціями
    console.log(`\n💾 Оновлення ${toUpdate.length} Secondary об'єктів у базі...`);
    
    const chunkSize = 100;
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      // Use query builder for faster updates or raw SQL to avoid TypeORM overhead
      const promises = chunk.map(prop => 
        propertyRepo.update(prop.id, { photos: prop.photos })
      );
      await Promise.all(promises);
      process.stdout.write(`\r   Збережено: ${Math.min(i + chunkSize, toUpdate.length)}/${toUpdate.length}`);
    }
    console.log('\n✅ Оновлення бази даних завершено!');

    // 4. Записуємо "не знайдені" будівлі
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
