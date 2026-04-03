import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

const PLACEHOLDER_LOGO = 'https://foryou-realestate.com/logo.png';

function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b(the|tower|towers|residence|residences|building|apartments|villa|villas|hotel|tower[\s]?a|tower[\s]?b|tower[\s]?c|tower[\s]?d|tower[\s]?1|tower[\s]?2|tower[\s]?3|tower[\s]?4|tower[\s]?5)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Utility to parse photos string into array
 */
function parsePhotos(photos: any): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos;
  if (typeof photos === 'string') {
    return photos.split(',').map(p => p.trim()).filter(p => !!p);
  }
  return [];
}

async function globalResetAndRemap() {
  try {
    console.log('🔄 Підключення до бази даних...');
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const propertyRepo = AppDataSource.getRepository(Property);

    // 1. Отримуємо всі проекти для точного мапінгу
    console.log('📖 Завантаження Off-Plan проектів...');
    const offPlanProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'photos']
    });

    const offPlanMap = new Map<string, string>();
    offPlanProperties.forEach(op => {
      const photos = parsePhotos(op.photos);
      if (op.name && photos.length > 0) {
        const normName = normalizeName(op.name);
        if (normName) offPlanMap.set(normName, photos.join(','));
      }
    });

    // 2. Отримуємо всі Secondary об'єкти
    console.log('📖 Завантаження Secondary об\'єктів...');
    const secondaryProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.SECONDARY },
      select: ['id', 'name', 'buildingName', 'photos']
    });

    console.log(`📊 Обробка ${secondaryProperties.length} об'єктів...`);
    const toUpdate: Property[] = [];
    let placeholderCount = 0;
    let mappedCount = 0;

    for (const prop of secondaryProperties) {
      const currentPhotos = parsePhotos(prop.photos);
      
      // Спробуємо знайти 100% точний матч
      const nameToMatch = prop.buildingName || prop.name;
      const normName = normalizeName(nameToMatch);
      const correctProjectPhotos = offPlanMap.get(normName);

      let finalPhotos: string;

      if (correctProjectPhotos) {
        // Знайшли точний матч! Використовуємо фото проекту
        finalPhotos = correctProjectPhotos;
        mappedCount++;
      } else {
        // Матч не знайдено. Очищуємо від Reelly та ставимо заглушку якщо пусто
        const originalPhotos = currentPhotos.filter(url => 
           !url.includes('reelly.io') && 
           !url.includes('reelly-backend.s3')
        );

        if (originalPhotos.length === 0) {
          finalPhotos = PLACEHOLDER_LOGO;
          placeholderCount++;
        } else {
          finalPhotos = originalPhotos.join(',');
        }
      }

      // Оновлюємо тільки якщо дані змінилися
      if (finalPhotos !== (prop.photos as any)) {
        prop.photos = finalPhotos as any;
        toUpdate.push(prop);
      }
    }

    console.log(`\n💾 Збереження змін у базу (${toUpdate.length} записів)...`);
    const chunkSize = 100;
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      const promises = chunk.map(p => propertyRepo.update(p.id, { photos: p.photos }));
      await Promise.all(promises);
      process.stdout.write(`\r   Прогрес: ${Math.min(i + chunkSize, toUpdate.length)}/${toUpdate.length}`);
    }

    console.log('\n\n✅ ГОТОВО!');
    console.log(`   ✨ Точно замаплено на проекти: ${mappedCount}`);
    console.log(`   🖼 Встановлено синю заглушку логотип: ${placeholderCount}`);
    console.log(`   📉 Всього оновлено записів: ${toUpdate.length}`);

  } catch (error) {
    console.error('❌ Помилка:', error);
  } finally {
    process.exit(0);
  }
}

globalResetAndRemap();
