import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';
import { Area } from '../entities/Area';

/**
 * Діагностичний скрипт для перевірки проблеми з /api/public/data
 * Перевіряє, чи об'єкти мають різні areaId
 */
async function checkPropertiesDiagnostic() {
  try {
    console.log('🔍 Початок діагностики...\n');

    // Ініціалізація БД
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Підключено до БД\n');
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const areaRepo = AppDataSource.getRepository(Area);

    // 1. Перевірка загальної статистики
    console.log('📊 1. Загальна статистика:');
    const totalProperties = await propertyRepo.count();
    const allProperties = await propertyRepo.find({
      select: ['id', 'name', 'areaId'],
    });

    const uniqueAreaIds = [...new Set(allProperties.map(p => p.areaId))];
    
    console.log(`   - Всього об'єктів: ${totalProperties}`);
    console.log(`   - Унікальних areaId: ${uniqueAreaIds.length}`);
    console.log(`   - Список areaId: ${uniqueAreaIds.join(', ')}\n`);

    // 2. Перевірка кількості об'єктів по кожному areaId
    console.log('📊 2. Кількість об\'єктів по areaId:');
    const areaCounts: { [key: string]: number } = {};
    allProperties.forEach(p => {
      areaCounts[p.areaId] = (areaCounts[p.areaId] || 0) + 1;
    });

    const sortedAreaCounts = Object.entries(areaCounts)
      .sort(([, a], [, b]) => b - a);

    for (const [areaId, count] of sortedAreaCounts) {
      const area = await areaRepo.findOne({ where: { id: areaId } });
      const areaName = area ? `${area.nameEn} (${area.nameRu})` : 'Unknown';
      console.log(`   - ${areaId}: ${count} об'єктів (${areaName})`);
    }
    console.log('');

    // 3. Перевірка конкретних area IDs
    console.log('📊 3. Перевірка конкретних area IDs:');
    const specificAreaIds = [
      '4811bb28-d527-4c12-a9dd-5ef08a16ed30', // Bluewaters
      '7924f2dd-94bf-4ec3-b3fe-cbc5606a073a', // Business Bay
      '24211934-94ef-4d71-aa94-900825858a4c'  // Те що повертається
    ];

    for (const areaId of specificAreaIds) {
      const count = await propertyRepo.count({ where: { areaId } });
      const area = await areaRepo.findOne({ where: { id: areaId } });
      const areaName = area ? `${area.nameEn} (${area.nameRu})` : 'Unknown';
      console.log(`   - ${areaId}: ${count} об'єктів (${areaName})`);
    }
    console.log('');

    // 4. Перевірка валідності зв'язків
    console.log('📊 4. Перевірка валідності зв\'язків:');
    const invalidProperties = [];
    for (const property of allProperties) {
      const area = await areaRepo.findOne({ where: { id: property.areaId } });
      if (!area) {
        invalidProperties.push({
          id: property.id,
          name: property.name,
          areaId: property.areaId
        });
      }
    }

    if (invalidProperties.length === 0) {
      console.log('   ✅ Всі об\'єкти мають валідні areaId');
    } else {
      console.log(`   ⚠️  Знайдено ${invalidProperties.length} об'єктів з невалідними areaId:`);
      invalidProperties.slice(0, 10).forEach(p => {
        console.log(`      - ${p.name} (${p.id}): areaId = ${p.areaId}`);
      });
    }
    console.log('');

    // 5. Перевірка, що повертає endpoint
    console.log('📊 5. Симуляція запиту /api/public/data:');
    const endpointProperties = await propertyRepo.find({
      relations: ['country', 'city', 'area', 'developer', 'facilities', 'units'],
      order: { createdAt: 'DESC' },
    });

    const endpointAreaIds = [...new Set(endpointProperties.map(p => p.areaId))];
    console.log(`   - Повертається об'єктів: ${endpointProperties.length}`);
    console.log(`   - Унікальних areaId: ${endpointAreaIds.length}`);
    console.log(`   - Список areaId: ${endpointAreaIds.join(', ')}\n`);

    // 6. Висновок
    console.log('📋 ВИСНОВОК:');
    if (uniqueAreaIds.length === 1) {
      console.log('   ⚠️  ПРОБЛЕМА: Всі об\'єкти мають один areaId!');
      console.log('   💡 Рішення: Оновіть дані в БД, додавши об\'єкти з іншими areaId');
    } else {
      console.log(`   ✅ Дані виглядають нормально: ${uniqueAreaIds.length} різних areaId`);
    }

    if (endpointAreaIds.length !== uniqueAreaIds.length) {
      console.log('   ⚠️  ПРОБЛЕМА: Endpoint повертає іншу кількість areaId!');
    } else {
      console.log('   ✅ Endpoint повертає правильну кількість areaId');
    }

    console.log('\n✅ Діагностика завершена');

  } catch (error: any) {
    console.error('❌ Помилка під час діагностики:', error);
    console.error(error.stack);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Відключено від БД');
    }
  }
}

// Запуск скрипта
checkPropertiesDiagnostic();

