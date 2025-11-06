import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { Area } from '../entities/Area';

/**
 * Тестовий скрипт для перевірки secondary properties
 * Використання: npm run test:secondary
 */

async function testSecondaryProperties() {
  try {
    console.log('🔍 Тестування Secondary Properties...\n');

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const propertyRepo = AppDataSource.getRepository(Property);
    const areaRepo = AppDataSource.getRepository(Area);

    // 1. Перевірка кількості secondary properties
    console.log('1️⃣ Перевірка кількості secondary properties:');
    console.log('==========================================');
    const secondaryCount = await propertyRepo.count({
      where: { propertyType: PropertyType.SECONDARY },
    });
    console.log(`   ✅ Знайдено secondary properties: ${secondaryCount}\n`);

    // 2. Перевірка структури даних secondary property
    console.log('2️⃣ Перевірка структури даних secondary property:');
    console.log('==========================================');
    const sampleSecondary = await propertyRepo.findOne({
      where: { propertyType: PropertyType.SECONDARY },
      relations: ['country', 'city', 'area', 'developer', 'facilities'],
    });

    if (!sampleSecondary) {
      console.log('   ⚠️  Не знайдено жодного secondary property для тестування\n');
    } else {
      console.log('   ✅ Знайдено приклад secondary property:');
      console.log(`      ID: ${sampleSecondary.id}`);
      console.log(`      Name: ${sampleSecondary.name}`);
      console.log(`      Property Type: ${sampleSecondary.propertyType}`);
      
      // Перевірка обов'язкових полів
      const checks = {
        'price (USD)': sampleSecondary.price !== null && sampleSecondary.price !== undefined,
        'size (м²)': sampleSecondary.size !== null && sampleSecondary.size !== undefined,
        'bedrooms': sampleSecondary.bedrooms !== null && sampleSecondary.bedrooms !== undefined,
        'bathrooms': sampleSecondary.bathrooms !== null && sampleSecondary.bathrooms !== undefined,
        'area (об\'єкт)': sampleSecondary.area !== null && typeof sampleSecondary.area === 'object',
        'photos (масив)': Array.isArray(sampleSecondary.photos),
      };

      console.log('\n   Перевірка обов'язкових полів:');
      let allValid = true;
      for (const [field, isValid] of Object.entries(checks)) {
        const status = isValid ? '✅' : '❌';
        console.log(`      ${status} ${field}: ${isValid ? 'OK' : 'MISSING'}`);
        if (!isValid) allValid = false;
      }

      if (allValid) {
        console.log('\n   ✅ Всі обов'язкові поля присутні');
      } else {
        console.log('\n   ❌ Деякі обов'язкові поля відсутні');
      }

      // Перевірка структури area
      if (sampleSecondary.area) {
        console.log('\n   Перевірка структури area:');
        const areaChecks = {
          'area.id': !!sampleSecondary.area.id,
          'area.nameEn': !!sampleSecondary.area.nameEn,
          'area.nameRu': !!sampleSecondary.area.nameRu,
          'area - об\'єкт (не рядок)': typeof sampleSecondary.area === 'object' && !Array.isArray(sampleSecondary.area),
        };

        for (const [field, isValid] of Object.entries(areaChecks)) {
          const status = isValid ? '✅' : '❌';
          console.log(`      ${status} ${field}: ${isValid ? 'OK' : 'INVALID'}`);
        }
      }
      console.log('');
    }

    // 3. Перевірка фільтрів
    console.log('3️⃣ Перевірка фільтрів для secondary:');
    console.log('==========================================');
    
    // Фільтр по bedrooms
    const withBedrooms = await propertyRepo.count({
      where: {
        propertyType: PropertyType.SECONDARY,
        bedrooms: 2,
      },
    });
    console.log(`   ✅ Secondary з 2 спальнями: ${withBedrooms}`);

    // Фільтр по ціні
    const withPrice = await propertyRepo
      .createQueryBuilder('property')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.price IS NOT NULL')
      .andWhere('property.price > 0')
      .getCount();
    console.log(`   ✅ Secondary з ціною: ${withPrice}`);

    // Фільтр по розміру
    const withSize = await propertyRepo
      .createQueryBuilder('property')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.size IS NOT NULL')
      .andWhere('property.size > 0')
      .getCount();
    console.log(`   ✅ Secondary з розміром: ${withSize}\n`);

    // 4. Перевірка підрахунку в areas
    console.log('4️⃣ Перевірка підрахунку secondary в areas:');
    console.log('==========================================');
    
    const areas = await areaRepo.find({
      relations: ['city', 'city.country'],
    });

    // Підрахунок properties по areas
    const areaPropertyCounts = await propertyRepo
      .createQueryBuilder('property')
      .select('property.areaId', 'areaId')
      .addSelect('property.propertyType', 'propertyType')
      .addSelect('COUNT(property.id)', 'count')
      .where('property.areaId IS NOT NULL')
      .groupBy('property.areaId, property.propertyType')
      .getRawMany();

    const countsByArea = new Map<string, { offPlan: number; secondary: number }>();
    
    areaPropertyCounts.forEach((row: any) => {
      const areaId = row.areaId;
      const type = row.propertyType;
      const count = parseInt(row.count, 10);

      if (!countsByArea.has(areaId)) {
        countsByArea.set(areaId, { offPlan: 0, secondary: 0 });
      }

      const counts = countsByArea.get(areaId)!;
      if (type === PropertyType.OFF_PLAN) {
        counts.offPlan = count;
      } else if (type === PropertyType.SECONDARY) {
        counts.secondary = count;
      }
    });

    // Показуємо топ 10 areas з secondary properties
    const areasWithSecondary = areas
      .map(area => {
        const counts = countsByArea.get(area.id) || { offPlan: 0, secondary: 0 };
        return {
          area,
          counts,
          total: counts.offPlan + counts.secondary,
        };
      })
      .filter(item => item.counts.secondary > 0)
      .sort((a, b) => b.counts.secondary - a.counts.secondary)
      .slice(0, 10);

    console.log(`   ✅ Знайдено ${areasWithSecondary.length} areas з secondary properties\n`);
    console.log('   Топ 10 areas з secondary properties:');
    areasWithSecondary.forEach((item, index) => {
      console.log(`      ${index + 1}. ${item.area.nameEn}:`);
      console.log(`         - Secondary: ${item.counts.secondary}`);
      console.log(`         - Off-plan: ${item.counts.offPlan}`);
      console.log(`         - Total: ${item.total}`);
    });
    console.log('');

    // 5. Перевірка конвертації цін та розмірів
    console.log('5️⃣ Перевірка конвертації цін та розмірів:');
    console.log('==========================================');
    
    const withConversions = await propertyRepo
      .createQueryBuilder('property')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.price IS NOT NULL')
      .andWhere('property.size IS NOT NULL')
      .getMany();

    if (withConversions.length > 0) {
      const sample = withConversions[0];
      const priceAED = sample.price ? sample.price * 3.67 : null;
      const sizeSqft = sample.size ? sample.size * 10.764 : null;

      console.log(`   ✅ Приклад конвертації для property "${sample.name}":`);
      console.log(`      Price USD: $${sample.price}`);
      console.log(`      Price AED: ${priceAED ? `AED ${priceAED.toFixed(2)}` : 'N/A'}`);
      console.log(`      Size м²: ${sample.size}`);
      console.log(`      Size sqft: ${sizeSqft ? sizeSqft.toFixed(2) : 'N/A'}\n`);
    } else {
      console.log('   ⚠️  Не знайдено secondary properties з ціною та розміром\n');
    }

    // 6. Перевірка сортування
    console.log('6️⃣ Перевірка сортування:');
    console.log('==========================================');
    
    const sortedByPrice = await propertyRepo
      .createQueryBuilder('property')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.price IS NOT NULL')
      .orderBy('property.price', 'ASC')
      .limit(5)
      .getMany();

    console.log(`   ✅ Сортування по ціні (ASC) - перші 5:`);
    sortedByPrice.forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.name}: $${p.price}`);
    });
    console.log('');

    // 7. Підсумок
    console.log('7️⃣ Підсумок:');
    console.log('==========================================');
    console.log(`   ✅ Secondary properties в БД: ${secondaryCount}`);
    console.log(`   ✅ Areas з secondary properties: ${areasWithSecondary.length}`);
    console.log(`   ✅ Secondary з ціною: ${withPrice}`);
    console.log(`   ✅ Secondary з розміром: ${withSize}`);
    console.log(`   ✅ Secondary з bedrooms: ${withBedrooms}`);
    
    const allChecksPassed = secondaryCount > 0 && 
                           sampleSecondary !== null &&
                           sampleSecondary.price !== null &&
                           sampleSecondary.size !== null &&
                           sampleSecondary.area !== null &&
                           typeof sampleSecondary.area === 'object';

    if (allChecksPassed) {
      console.log('\n   ✅ Всі перевірки пройдені успішно!');
    } else {
      console.log('\n   ⚠️  Деякі перевірки не пройдені');
    }

  } catch (error) {
    console.error('❌ Помилка при тестуванні:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Запуск якщо викликано напряму
if (require.main === module) {
  testSecondaryProperties();
}

export { testSecondaryProperties };

