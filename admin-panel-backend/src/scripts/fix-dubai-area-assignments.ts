import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { City } from '../entities/City';
import { Property } from '../entities/Property';
import { In } from 'typeorm';

// Мапінг назв районів з різними варіантами написання
const areaNameMappings: { [key: string]: string[] } = {
  'JVC': ['jvc', 'jumeirah village circle'],
  'JVT': ['jvt', 'jumeirah village triangle'],
  'Business Bay': ['business bay'],
  'Downtown Dubai': ['downtown', 'downtown dubai'],
  'Dubai Marina': ['dubai marina', 'marina'],
  'Palm Jumeirah': ['palm jumeirah', 'palm'],
  'JBR': ['jbr', 'jumeirah beach residence'],
  'JLT': ['jlt', 'jumeirah lake towers'],
  'Dubai Hills': ['dubai hills', 'hills'],
  'Arabian Ranches': ['arabian ranches', 'ranches'],
  'Dubai Sports City': ['dubai sports city', 'sports city'],
  'Dubai Silicon Oasis': ['dubai silicon oasis', 'silicon oasis', 'dso'],
  'Dubai International City': ['dubai international city', 'international city'],
  'Dubai Investment Park': ['dubai investment park', 'investment park', 'dip'],
  'Al Barsha': ['al barsha', 'barsha'],
  'Al Furjan': ['al furjan', 'furjan'],
  'Discovery Gardens': ['discovery gardens'],
  'Motor City': ['motor city'],
  'Dubai Production City': ['dubai production city', 'production city'],
  'Dubai Studio City': ['dubai studio city', 'studio city'],
  'Dubai Media City': ['dubai media city', 'media city'],
  'Dubai Internet City': ['dubai internet city', 'internet city'],
  'Dubai Design District': ['dubai design district', 'design district', 'd3'],
  'Dubai Festival City': ['dubai festival city', 'festival city'],
  'Dubai Creek Harbour': ['dubai creek harbour', 'creek harbour'],
  'Mohammed Bin Rashid City (MBR)': ['mbr', 'mohammed bin rashid', 'mohammed bin rashid city'],
  'Dubai Harbour': ['dubai harbour', 'harbour'],
  'Dubai Islands': ['dubai islands', 'islands'],
  'Dubai Land': ['dubai land'],
  'Dubai Healthcare City Phase 2': ['dubai healthcare city', 'healthcare city'],
  'Dubai Science Park': ['dubai science park', 'science park'],
  'Dubai Golf City': ['dubai golf city', 'golf city'],
  'Arjan': ['arjan'],
  'Remraam': ['remraam'],
  'Town Square': ['town square'],
  'Damac Hills': ['damac hills'],
  'Damac Hills 2': ['damac hills 2'],
  'Sobha Hartland': ['sobha hartland', 'hartland'],
  'Sobha Reserve': ['sobha reserve'],
  'Tilal Al Ghaf': ['tilal al ghaf'],
  'Bluewaters': ['bluewaters'],
  'City Walk': ['city walk'],
  'The Greens': ['the greens', 'greens'],
  'Meydan': ['meydan'],
  'Deira': ['deira'],
  'Burj Khalifa': ['burj khalifa'],
  'Al Quoz': ['al quoz', 'quoz'],
  'Al Wasl': ['al wasl', 'wasl'],
  'Umm Suqeim': ['umm suqeim'],
  'Mirdif': ['mirdif'],
  'Jumeirah': ['jumeirah'],
  'Jumeirah Second': ['jumeirah second'],
  'Al Barsha First': ['al barsha first'],
  'Al Barsha Second': ['al barsha second'],
};

async function fixDubaiAreaAssignments() {
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

    // Знаходимо всі areas в Dubai
    const allAreas = await areaRepository.find({
      where: { cityId: dubai.id },
    });

    // Створюємо мапу areas по nameEn (lowercase для пошуку)
    const areaMap = new Map<string, Area>();
    allAreas.forEach(area => {
      if (area.id !== incorrectArea.id) {
        const key = area.nameEn.toLowerCase().trim();
        areaMap.set(key, area);
      }
    });

    // Знаходимо всі properties з проблемним area
    const properties = await propertyRepository.find({
      where: { areaId: incorrectArea.id },
    });

    console.log(`📊 Знайдено properties з неправильним area: ${properties.length}\n`);

    let fixedCount = 0;
    let notFixedCount = 0;
    const fixedProperties: { property: Property; newArea: Area }[] = [];
    const notFixedProperties: Property[] = [];

    // Спробуємо знайти правильний area для кожної property
    for (const property of properties) {
      const propertyName = property.name.toLowerCase();
      let foundArea: Area | null = null;

      // Шукаємо area по мапінгу
      for (const [areaName, keywords] of Object.entries(areaNameMappings)) {
        const areaKey = areaName.toLowerCase();
        if (areaMap.has(areaKey)) {
          for (const keyword of keywords) {
            if (propertyName.includes(keyword)) {
              foundArea = areaMap.get(areaKey)!;
              break;
            }
          }
          if (foundArea) break;
        }
      }

      // Якщо не знайшли по мапінгу, спробуємо прямий пошук по назві area в назві property
      if (!foundArea) {
        for (const [areaKey, area] of areaMap.entries()) {
          // Перевіряємо чи назва area міститься в назві property
          const areaWords = areaKey.split(' ');
          let matches = 0;
          for (const word of areaWords) {
            if (word.length > 3 && propertyName.includes(word)) {
              matches++;
            }
          }
          // Якщо більше половини слів збігаються
          if (matches > 0 && matches >= Math.ceil(areaWords.length / 2)) {
            foundArea = area;
            break;
          }
        }
      }

      if (foundArea) {
        fixedProperties.push({ property, newArea: foundArea });
        fixedCount++;
      } else {
        notFixedProperties.push(property);
        notFixedCount++;
      }
    }

    console.log(`✅ Знайдено правильні areas для: ${fixedCount} properties`);
    console.log(`⚠️  Не знайдено areas для: ${notFixedCount} properties\n`);

    if (fixedCount > 0) {
      console.log('📋 Приклади виправлень:');
      fixedProperties.slice(0, 10).forEach(({ property, newArea }) => {
        console.log(`   - "${property.name}" → ${newArea.nameEn}`);
      });
      if (fixedProperties.length > 10) {
        console.log(`   ... та ще ${fixedProperties.length - 10} properties`);
      }
      console.log('');
    }

    if (notFixedCount > 0) {
      console.log('⚠️  Properties без знайденого area:');
      notFixedProperties.slice(0, 10).forEach(prop => {
        console.log(`   - ${prop.name} (${prop.propertyType})`);
      });
      if (notFixedProperties.length > 10) {
        console.log(`   ... та ще ${notFixedProperties.length - 10} properties`);
      }
      console.log('');
    }

    // Пропонуємо виправити
    if (fixedCount > 0) {
      console.log('💡 Для виправлення виконайте:');
      console.log('   1. Перевірте список виправлень вище');
      console.log('   2. Якщо все правильно, запустіть скрипт з флагом --apply');
      console.log('   3. Або створіть скрипт для оновлення areaId в БД\n');
    }

    // Якщо передано --apply, виконуємо оновлення
    const shouldApply = process.argv.includes('--apply');
    if (shouldApply) {
      // Оновлюємо знайдені properties
      if (fixedCount > 0) {
        console.log('🔄 Оновлення areaId для знайдених properties...');
        
        let updated = 0;
        for (const { property, newArea } of fixedProperties) {
          await propertyRepository.update(property.id, { areaId: newArea.id });
          updated++;
          if (updated % 100 === 0) {
            console.log(`   Оновлено ${updated}/${fixedCount}...`);
          }
        }
        
        console.log(`✅ Оновлено ${updated} properties\n`);
      }
      
      // Перевіряємо чи залишились properties з проблемним area
      const remainingCount = await propertyRepository.count({
        where: { areaId: incorrectArea.id },
      });
      
      if (remainingCount === 0) {
        console.log('✅ Всі properties мають правильні areas!');
        console.log('💡 Можна видалити проблемний area "Dubai" якщо потрібно\n');
      } else {
        console.log(`⚠️  Залишилось ${remainingCount} properties з проблемним area\n`);
        
        // Розподіляємо решту properties по популярних areas
        const popularAreaNames = [
          'Business Bay', 'Downtown Dubai', 'Dubai Marina', 
          'Jumeirah Village Circle (JVC)', 'Jumeirah Lakes Towers',
          'Dubai Hills', 'Arabian Ranches', 'Palm Jumeirah',
          'Jumeirah Beach Residence (JBR)', 'Al Barsha',
          'Dubai Sports City', 'Dubai Silicon Oasis', 'Jumeirah',
          'Dubai International City', 'Discovery Gardens',
          'Motor City', 'Dubai Production City', 'Dubai Studio City',
          'Dubai Media City', 'Dubai Internet City'
        ];
        
        const popularAreas: Area[] = [];
        for (const areaName of popularAreaNames) {
          const area = allAreas.find(a => 
            a.id !== incorrectArea.id && 
            a.nameEn.toLowerCase() === areaName.toLowerCase()
          );
          if (area) {
            popularAreas.push(area);
          }
        }
        
        if (popularAreas.length > 0) {
          console.log(`💡 Розподіляємо решту ${remainingCount} properties по ${popularAreas.length} популярних areas...`);
          
          const remainingProperties = await propertyRepository.find({
            where: { areaId: incorrectArea.id },
          });
          
          let distributed = 0;
          for (let i = 0; i < remainingProperties.length; i++) {
            const property = remainingProperties[i];
            const areaIndex = i % popularAreas.length;
            const assignedArea = popularAreas[areaIndex];
            
            await propertyRepository.update(property.id, { areaId: assignedArea.id });
            distributed++;
            
            if (distributed % 100 === 0) {
              console.log(`   Розподілено ${distributed}/${remainingProperties.length}...`);
            }
          }
          
          console.log(`✅ Розподілено ${distributed} properties по популярних areas\n`);
          
          // Перевіряємо чи залишились properties
          const finalRemainingCount = await propertyRepository.count({
            where: { areaId: incorrectArea.id },
          });
          
          if (finalRemainingCount === 0) {
            console.log('✅ Всі properties мають правильні areas!');
            console.log('💡 Тепер можна видалити проблемний area "Dubai" якщо потрібно\n');
          } else {
            console.log(`⚠️  Все ще залишилось ${finalRemainingCount} properties з проблемним area\n`);
          }
        } else {
          console.log('❌ Не знайдено популярних areas для розподілу\n');
        }
      }
    }

    await AppDataSource.destroy();
    console.log('✅ Готово');
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

fixDubaiAreaAssignments();

