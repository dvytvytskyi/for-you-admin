import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { City } from '../entities/City';
import { Property } from '../entities/Property';
import { In } from 'typeorm';

async function fixDubaiAreas() {
  try {
    console.log('🔄 Підключення до БД...');
    await AppDataSource.initialize();
    console.log('✅ БД підключено\n');

    const areaRepository = AppDataSource.getRepository(Area);
    const cityRepository = AppDataSource.getRepository(City);
    const propertyRepository = AppDataSource.getRepository(Property);

    // Знаходимо Dubai city
    const dubai = await cityRepository.findOne({ 
      where: { nameEn: 'Dubai' } 
    });

    if (!dubai) {
      console.error('❌ Місто Dubai не знайдено');
      process.exit(1);
    }

    console.log(`✅ Знайдено місто: ${dubai.nameEn} (ID: ${dubai.id})\n`);

    // Знаходимо всі areas з nameEn = "Dubai"
    const incorrectAreas = await areaRepository.find({
      where: { nameEn: 'Dubai' },
      relations: ['city'],
    });

    console.log(`📊 Знайдено areas з nameEn = "Dubai": ${incorrectAreas.length}\n`);

    if (incorrectAreas.length === 0) {
      console.log('✅ Проблемних areas не знайдено');
      await AppDataSource.destroy();
      return;
    }

    // Показуємо деталі
    for (const area of incorrectAreas) {
      console.log(`  - Area ID: ${area.id}`);
      console.log(`    nameEn: ${area.nameEn}`);
      console.log(`    cityId: ${area.cityId}`);
      console.log(`    city: ${area.city?.nameEn || 'N/A'}`);
      
      // Підраховуємо properties з цим areaId
      const propertyCount = await propertyRepository.count({
        where: { areaId: area.id },
      });
      console.log(`    properties: ${propertyCount}`);
      console.log('');
    }

    // Перевіряємо properties з цими areas
    const areaIds = incorrectAreas.map(a => a.id);
    const propertiesWithIncorrectArea = await propertyRepository.find({
      where: { areaId: In(areaIds) },
      relations: ['area', 'city'],
    });

    console.log(`\n📊 Properties з неправильними areas: ${propertiesWithIncorrectArea.length}\n`);

    if (propertiesWithIncorrectArea.length > 0) {
      // Групуємо по cityId, щоб зрозуміти які areas потрібно створити
      const cityGroups = new Map<string, { city: City; properties: Property[] }>();
      
      for (const property of propertiesWithIncorrectArea) {
        const cityId = property.cityId;
        if (!cityGroups.has(cityId)) {
          cityGroups.set(cityId, {
            city: property.city!,
            properties: [],
          });
        }
        cityGroups.get(cityId)!.properties.push(property);
      }

      console.log('📋 Групи по містах:');
      for (const [cityId, group] of cityGroups) {
        console.log(`  - ${group.city.nameEn}: ${group.properties.length} properties`);
      }
      console.log('');

      // Пропонуємо виправлення
      console.log('⚠️  Для виправлення потрібно:');
      console.log('  1. Визначити правильні назви районів для кожної property');
      console.log('  2. Створити або знайти правильні areas');
      console.log('  3. Оновити areaId для properties\n');

      // Якщо всі properties з Dubai, можемо спробувати створити загальний area
      if (cityGroups.size === 1 && cityGroups.has(dubai.id)) {
        console.log('💡 Всі properties з Dubai. Можна створити загальний area "Dubai" або визначити конкретні райони.\n');
      }
    }

    await AppDataSource.destroy();
    console.log('✅ Готово');
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

fixDubaiAreas();

