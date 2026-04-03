import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

/**
 * Utility to normalize names for better matching
 */
function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b(the|tower|towers|residence|residences|building|apartments|villa|villas|hotel|tower[\s]?a|tower[\s]?b|tower[\s]?c|tower[\s]?d|tower[\s]?1|tower[\s]?2|tower[\s]?3|tower[\s]?4|tower[\s]?5)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fixAndRemap() {
  try {
    console.log('🔄 Підключення до бази даних...');
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const propertyRepo = AppDataSource.getRepository(Property);

    // 1.Знаходимо всі масові дублікати галерей (чорний список)
    console.log('🔍 Пошук масових дублікатів галерей...');
    const allSecondary = await propertyRepo.find({
      where: { propertyType: PropertyType.SECONDARY },
      select: ['id', 'photos']
    });

    const fingerprintCounts: Record<string, number> = {};
    allSecondary.forEach(p => {
      const fp = p.photos as any;
      if (fp && fp.length > 10) {
        fingerprintCounts[fp] = (fingerprintCounts[fp] || 0) + 1;
      }
    });

    const blackList = new Set(
      Object.entries(fingerprintCounts)
        .filter(([fp, count]) => count > 5) // Галереї, що повторюються на > 5 об'єктах
        .map(([fp]) => fp)
    );

    console.log(`❌ Знайдено ${blackList.size} унікальних галерей-дублікатів, які потребують очищення.`);

    // 2. Завантажуємо правильні Off-Plan проекти
    console.log('📖 Завантаження правильних Off-Plan проектів...');
    const offPlanProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'photos']
    });

    const offPlanMap = new Map<string, string>();
    offPlanProperties.forEach(op => {
      if (op.name && op.photos && (op.photos as any).length > 0) {
        const normName = normalizeName(op.name);
        if (normName) offPlanMap.set(normName, op.photos as any);
      }
    });

    // 3. Очищення та новий мапінг
    console.log('🏗 Початок процесу відновлення даних...');
    const toUpdate: Property[] = [];
    let clearedCount = 0;
    let remappedCount = 0;

    const secondaryDetails = await propertyRepo.find({
        where: { propertyType: PropertyType.SECONDARY },
        select: ['id', 'name', 'buildingName', 'photos']
    });

    for (const prop of secondaryDetails) {
      const currentPhotos = prop.photos as any;
      const isCorrupted = blackList.has(currentPhotos);
      
      const nameToMatch = prop.buildingName || prop.name;
      const normName = normalizeName(nameToMatch);
      const correctPhotos = offPlanMap.get(normName);

      if (correctPhotos) {
        // Якщо знайшли правильний матч - оновлюємо (навіть якщо не було "зараження")
        if (currentPhotos !== correctPhotos) {
          prop.photos = correctPhotos as any;
          toUpdate.push(prop);
          remappedCount++;
        }
      } else if (isCorrupted) {
        // Якщо матч не знайдено, але галерея "заражена" - очищуємо
        prop.photos = '' as any;
        toUpdate.push(prop);
        clearedCount++;
      }
    }

    console.log(`\n💾 Зберігання змін у базу (${toUpdate.length} записів)...`);
    const chunkSize = 100;
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      const promises = chunk.map(p => propertyRepo.update(p.id, { photos: p.photos }));
      await Promise.all(promises);
      process.stdout.write(`\r   Прогрес: ${Math.min(i + chunkSize, toUpdate.length)}/${toUpdate.length}`);
    }

    console.log('\n\n✅ ГОТОВО!');
    console.log(`   ✨ Правильно перемаплено: ${remappedCount} об'єктів`);
    console.log(`   🧹 Очищено від сміття: ${clearedCount} об'єктів`);
    console.log(`   📉 Разом змінено: ${toUpdate.length} записів`);

  } catch (error) {
    console.error('❌ Помилка:', error);
  } finally {
    process.exit(0);
  }
}

fixAndRemap();
