import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function checkSecondaryCount() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const propertyRepo = AppDataSource.getRepository(Property);

    // Перевіряємо кількість secondary об'єктів
    const secondaryCount = await propertyRepo.count({
      where: { propertyType: PropertyType.SECONDARY },
    });

    const totalCount = await propertyRepo.count();

    console.log('📊 Статистика об\'єктів в БД:');
    console.log(`   - Всього об'єктів: ${totalCount}`);
    console.log(`   - Secondary об'єктів: ${secondaryCount}`);
    console.log(`   - Off-plan об'єктів: ${totalCount - secondaryCount}`);

    // Перевіряємо унікальні areas для secondary
    const secondaryProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.SECONDARY },
      relations: ['area'],
      select: ['id', 'name', 'areaId'],
    });

    const uniqueAreas = new Set(secondaryProperties.map(p => p.areaId));
    console.log(`   - Унікальних areas для secondary: ${uniqueAreas.size}`);

    // Перевіряємо кількість об'єктів по areas (топ 10)
    const areaCounts: { [key: string]: number } = {};
    secondaryProperties.forEach(p => {
      areaCounts[p.areaId] = (areaCounts[p.areaId] || 0) + 1;
    });

    const topAreas = Object.entries(areaCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    console.log('\n📊 Топ 10 areas за кількістю secondary об\'єктів:');
    for (const [areaId, count] of topAreas) {
      const area = secondaryProperties.find(p => p.areaId === areaId)?.area;
      const areaName = area ? `${area.nameEn}` : areaId;
      console.log(`   - ${areaName}: ${count} об'єктів`);
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

checkSecondaryCount();

