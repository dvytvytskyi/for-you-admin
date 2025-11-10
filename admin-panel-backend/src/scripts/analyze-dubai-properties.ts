import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { City } from '../entities/City';
import { Property } from '../entities/Property';
import { In } from 'typeorm';

async function analyzeDubaiProperties() {
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

    // Знаходимо проблемний area
    const incorrectArea = await areaRepository.findOne({
      where: { nameEn: 'Dubai', cityId: dubai.id },
    });

    if (!incorrectArea) {
      console.log('✅ Проблемних areas не знайдено');
      await AppDataSource.destroy();
      return;
    }

    console.log(`⚠️  Проблемний area: ${incorrectArea.nameEn} (ID: ${incorrectArea.id})\n`);

    // Знаходимо всі properties з цим area
    const properties = await propertyRepository.find({
      where: { areaId: incorrectArea.id },
      relations: ['area', 'city'],
      order: { name: 'ASC' },
    });

    console.log(`📊 Знайдено properties: ${properties.length}\n`);

    // Перевіряємо, чи є інші areas в Dubai
    const allDubaiAreas = await areaRepository.find({
      where: { cityId: dubai.id },
      order: { nameEn: 'ASC' },
    });

    console.log(`📊 Всього areas в Dubai: ${allDubaiAreas.length}`);
    console.log(`   (включаючи проблемний area "${incorrectArea.nameEn}")\n`);

    // Показуємо список всіх areas (крім проблемного)
    const validAreas = allDubaiAreas.filter(a => a.id !== incorrectArea.id);
    console.log(`✅ Валідні areas в Dubai (${validAreas.length}):`);
    validAreas.slice(0, 20).forEach(area => {
      console.log(`   - ${area.nameEn}`);
    });
    if (validAreas.length > 20) {
      console.log(`   ... та ще ${validAreas.length - 20} areas`);
    }
    console.log('');

    // Показуємо приклади properties
    console.log('📋 Приклади properties з неправильним area:');
    properties.slice(0, 10).forEach(prop => {
      console.log(`   - ${prop.name} (${prop.propertyType})`);
    });
    if (properties.length > 10) {
      console.log(`   ... та ще ${properties.length - 10} properties`);
    }
    console.log('');

    // Статистика по типах properties
    const offPlanCount = properties.filter(p => p.propertyType === 'off-plan').length;
    const secondaryCount = properties.filter(p => p.propertyType === 'secondary').length;
    
    console.log('📊 Статистика:');
    console.log(`   Off-plan: ${offPlanCount}`);
    console.log(`   Secondary: ${secondaryCount}\n`);

    // Рекомендації
    console.log('💡 Рекомендації для виправлення:');
    console.log('   1. Якщо у вас є інформація про правильні райони для properties:');
    console.log('      - Створіть або знайдіть правильні areas');
    console.log('      - Оновіть areaId для кожної property');
    console.log('   2. Якщо інформації про райони немає:');
    console.log('      - Можна створити загальний area "Dubai" (якщо він не існує)');
    console.log('      - Або розподілити properties по існуючих areas випадково\n');

    await AppDataSource.destroy();
    console.log('✅ Готово');
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

analyzeDubaiProperties();

