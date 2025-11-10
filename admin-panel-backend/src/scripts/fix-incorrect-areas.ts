import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { City } from '../entities/City';
import { Property } from '../entities/Property';
import { In } from 'typeorm';

async function fixIncorrectAreas() {
  try {
    console.log('🔄 Підключення до БД...');
    await AppDataSource.initialize();
    console.log('✅ БД підключено\n');

    const areaRepository = AppDataSource.getRepository(Area);
    const cityRepository = AppDataSource.getRepository(City);
    const propertyRepository = AppDataSource.getRepository(Property);

    // Знаходимо всі міста
    const cities = await cityRepository.find();
    const cityNames = cities.map(c => c.nameEn.toLowerCase());

    console.log(`📊 Знайдено міст: ${cities.length}\n`);

    // Знаходимо всі areas, де nameEn збігається з назвою міста
    const incorrectAreas: Area[] = [];
    
    for (const city of cities) {
      const areasWithCityName = await areaRepository.find({
        where: { 
          nameEn: city.nameEn,
          cityId: city.id, // Перевіряємо тільки areas в тому ж місті
        },
        relations: ['city'],
      });
      
      if (areasWithCityName.length > 0) {
        console.log(`⚠️  Знайдено areas з nameEn = "${city.nameEn}" в місті ${city.nameEn}: ${areasWithCityName.length}`);
        incorrectAreas.push(...areasWithCityName);
      }
    }

    console.log(`\n📊 Всього проблемних areas: ${incorrectAreas.length}\n`);

    if (incorrectAreas.length === 0) {
      console.log('✅ Проблемних areas не знайдено');
      await AppDataSource.destroy();
      return;
    }

    // Показуємо деталі та підраховуємо properties
    const areaIds = incorrectAreas.map(a => a.id);
    const propertiesWithIncorrectArea = await propertyRepository.find({
      where: { areaId: In(areaIds) },
      relations: ['area', 'city', 'country'],
    });

    console.log(`📊 Properties з неправильними areas: ${propertiesWithIncorrectArea.length}\n`);

    if (propertiesWithIncorrectArea.length === 0) {
      console.log('✅ Properties з неправильними areas не знайдено');
      await AppDataSource.destroy();
      return;
    }

    // Групуємо properties по містах та показуємо статистику
    const cityGroups = new Map<string, { 
      city: City; 
      properties: Property[];
      areas: Area[];
    }>();
    
    for (const property of propertiesWithIncorrectArea) {
      const cityId = property.cityId;
      if (!cityGroups.has(cityId)) {
        cityGroups.set(cityId, {
          city: property.city!,
          properties: [],
          areas: [],
        });
      }
      cityGroups.get(cityId)!.properties.push(property);
    }

    // Додаємо areas до груп
    for (const area of incorrectAreas) {
      const group = cityGroups.get(area.cityId);
      if (group && !group.areas.find(a => a.id === area.id)) {
        group.areas.push(area);
      }
    }

    console.log('📋 Статистика по містах:');
    for (const [cityId, group] of cityGroups) {
      console.log(`\n  Місто: ${group.city.nameEn}`);
      console.log(`    Properties: ${group.properties.length}`);
      console.log(`    Проблемні areas: ${group.areas.length}`);
      
      // Показуємо приклади properties
      const sampleProperties = group.properties.slice(0, 3);
      console.log(`    Приклади properties:`);
      for (const prop of sampleProperties) {
        console.log(`      - ${prop.name} (${prop.propertyType})`);
      }
    }

    console.log('\n⚠️  УВАГА: Для виправлення потрібно:');
    console.log('  1. Визначити правильні назви районів для кожної property');
    console.log('  2. Створити або знайти правильні areas в БД');
    console.log('  3. Оновити areaId для properties');
    console.log('\n💡 Рекомендація:');
    console.log('  - Перевірте дані в properties (можливо є додаткова інформація про район)');
    console.log('  - Створіть правильні areas або використайте існуючі');
    console.log('  - Оновіть areaId для всіх properties\n');

    await AppDataSource.destroy();
    console.log('✅ Готово');
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

fixIncorrectAreas();

