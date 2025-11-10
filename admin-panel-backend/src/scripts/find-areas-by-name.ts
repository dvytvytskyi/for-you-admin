import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';

async function findAreasByName() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const areaRepo = AppDataSource.getRepository(Area);

    const areaNames = [
      'business bay',
      'downtown',
      'citywalk',
      'palmjumeirah',
      'jvc',
      'dubai hills',
    ];

    console.log('🔍 Пошук районів...\n');

    for (const areaName of areaNames) {
      // Шукаємо за nameEn (case-insensitive)
      const areas = await areaRepo
        .createQueryBuilder('area')
        .where('LOWER(area.nameEn) LIKE LOWER(:name)', { name: `%${areaName}%` })
        .orWhere('LOWER(area.nameRu) LIKE LOWER(:name)', { name: `%${areaName}%` })
        .orWhere('LOWER(area.nameAr) LIKE LOWER(:name)', { name: `%${areaName}%` })
        .getMany();

      if (areas.length > 0) {
        console.log(`📍 ${areaName}:`);
        areas.forEach(area => {
          console.log(`   ID: ${area.id}`);
          console.log(`   Name (EN): ${area.nameEn}`);
          console.log(`   Name (RU): ${area.nameRu || 'N/A'}`);
          console.log(`   City ID: ${area.cityId}`);
          console.log('');
        });
      } else {
        console.log(`❌ ${areaName}: не знайдено\n`);
      }
    }

    await AppDataSource.destroy();
    console.log('✅ Готово!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

findAreasByName();

