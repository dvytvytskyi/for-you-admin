import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { Country } from '../entities/Country';
import { City } from '../entities/City';
import { Area } from '../entities/Area';
import { Facility } from '../entities/Facility';
import * as fs from 'fs';
import * as path from 'path';

interface SecondaryProperty {
  id: string;
  url: string;
  title: string;
  displayAddress: string;
  buildingName?: string;
  communityName: string;
  bedrooms: any;
  bathrooms: any;
  addedOn: string;
  agent: string;
  agentInfo: any;
  agentPhone: string;
  agentWhatsapp: string;
  agentEmail: string;
  verified: boolean;
  reference: string;
  brokerInfo: any;
  priceDuration: string;
  propertyType: string;
  price: number;
  rera: string;
  priceCurrency: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  type: string;
  size: number;
  sizeMin?: any;
  furnishing?: string;
  description: string;
  images: string[];
  features?: string[];
}

const USD_TO_AED = 3.67;
const SQM_TO_SQFT = 10.764;

// Мапінг features -> facility names
const featureToFacilityMap: { [key: string]: string } = {
  'Central A/C': 'Central A/C',
  'Balcony': 'Balcony',
  'Shared Pool': 'Swimming Pool',
  'Swimming Pool': 'Swimming Pool',
  'Shared Spa': 'Spa',
  'Security': '24/7 Security',
  'Covered Parking': 'Parking',
  'Built in Wardrobes': 'Built-in Wardrobes',
  'Lobby in Building': 'Lobby',
  'Shared Gym': 'Gym',
  'Fitness Center': 'Gym',
  'Gym': 'Gym',
  'Concierge': 'Concierge',
  'Children\'s Play Area': 'Kids Play Area',
  'Kids Play Area': 'Kids Play Area',
  'Barbecue Area': 'BBQ Area',
  'BBQ Area': 'BBQ Area',
  'Walk-in Closet': 'Walk-in Closet',
  'Kitchen Appliances': 'Kitchen Appliances',
  'View of Water': 'Water View',
  'View of Landmark': 'Landmark View',
  'Pets Allowed': 'Pets Allowed',
  'Children\'s Pool': 'Kids Pool',
};

async function importSecondaryProperties() {
  try {
    console.log('🔄 Підключення до БД...');
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const propertyRepo = AppDataSource.getRepository(Property);
    const countryRepo = AppDataSource.getRepository(Country);
    const cityRepo = AppDataSource.getRepository(City);
    const areaRepo = AppDataSource.getRepository(Area);
    const facilityRepo = AppDataSource.getRepository(Facility);

    // Очислення існуючих secondary властивостей
    console.log('🗑️  Видалення існуючих secondary властивостей...');
    await propertyRepo.delete({ propertyType: PropertyType.SECONDARY });
    console.log('✅ Очищено\n');

    // Читаємо JSON файл
    const jsonPath = path.resolve(__dirname, '../../../dataset_propertyfinder-scraper_2025-11-03_17-07-17-191.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Файл не знайдено: ${jsonPath}`);
    }

    console.log(`📖 Читання файлу: ${path.basename(jsonPath)}...`);
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const properties: SecondaryProperty[] = JSON.parse(jsonContent);
    console.log(`   Знайдено ${properties.length} об'єктів\n`);

    // Знаходимо або створюємо UAE та Dubai
    let country = await countryRepo.findOne({ where: { code: 'AE' } });
    if (!country) {
      country = await countryRepo.save({
        nameEn: 'United Arab Emirates',
        nameRu: 'Объединенные Арабские Эмираты',
        nameAr: 'الإمارты العربية المتحدة',
        code: 'AE',
      });
      console.log('✅ Створено країну: UAE');
    }

    let city = await cityRepo.findOne({ where: { nameEn: 'Dubai', countryId: country.id } });
    if (!city) {
      city = await cityRepo.save({
        nameEn: 'Dubai',
        nameRu: 'Дубай',
        nameAr: 'دبي',
        countryId: country.id,
      });
      console.log('✅ Створено місто: Dubai');
    }

    // Кеші
    const areaCache = new Map<string, Area>();
    const facilityCache = new Map<string, Facility>();

    // Завантажуємо існуючі facilities
    const existingFacilities = await facilityRepo.find();
    existingFacilities.forEach(f => {
      facilityCache.set(f.nameEn.toLowerCase(), f);
    });

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    console.log('🔄 Імпорт об\'єктів...\n');

    // Обробляємо кожен об'єкт
    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];

      try {
        // Валідація обов'язкових полів
        if (!prop.title || !prop.images || prop.images.length === 0) {
          errors.push(`Об'єкт ${i + 1}: Відсутні обов'язкові поля (title або images)`);
          errorCount++;
          continue;
        }

        // Валідація координат
        if (!prop.coordinates || !prop.coordinates.latitude || !prop.coordinates.longitude) {
          errors.push(`Об'єкт ${i + 1}: Відсутні координати`);
          errorCount++;
          continue;
        }

        // Валідація ціни
        if (!prop.price || prop.price <= 0) {
          errors.push(`Об'єкт ${i + 1}: Невалідна ціна`);
          errorCount++;
          continue;
        }

        // Конвертація ціни з AED в USD
        let priceUSD = prop.price;
        if (prop.priceCurrency === 'AED') {
          priceUSD = prop.price / USD_TO_AED;
        }

        // Конвертація розміру з sqft в sqm
        let sizeSQM = prop.size ? prop.size / SQM_TO_SQFT : null;

        // Беремо areaName з communityName або displayAddress
        const areaName = prop.communityName || prop.displayAddress || 'Dubai';
        
        // Знаходимо або створюємо Area
        let area = areaCache.get(areaName);
        if (!area) {
          const foundArea = await areaRepo.findOne({
            where: {
              cityId: city.id,
              nameEn: areaName,
            },
          });

          if (foundArea) {
            area = foundArea;
          } else {
            area = await areaRepo.save({
              cityId: city.id,
              nameEn: areaName,
              nameRu: areaName,
              nameAr: areaName,
            });
          }

          areaCache.set(areaName, area);
        }

        if (!area) {
          errors.push(`Об'єкт ${i + 1}: Не вдалося створити або знайти area`);
          errorCount++;
          continue;
        }

        // Обробляємо facilities
        const facilities: Facility[] = [];
        if (prop.features && prop.features.length > 0) {
          for (const feature of prop.features) {
            const facilityName = featureToFacilityMap[feature] || feature;
            const facilityKey = facilityName.toLowerCase();

            let facility = facilityCache.get(facilityKey);
            if (!facility) {
              const foundFacility = await facilityRepo.findOne({
                where: { nameEn: facilityName },
              });

              if (foundFacility) {
                facility = foundFacility;
              } else {
                facility = await facilityRepo.save({
                  nameEn: facilityName,
                  nameRu: facilityName,
                  nameAr: facilityName,
                  iconName: 'checkmark-circle',
                });
              }

              facilityCache.set(facilityKey, facility);
            }

            if (facility) {
              facilities.push(facility);
            }
          }
        }

        // Створюємо об'єкт через query builder
        const insertResult = await propertyRepo
          .createQueryBuilder()
          .insert()
          .into(Property)
          .values({
            propertyType: PropertyType.SECONDARY,
            name: prop.title,
            photos: prop.images || [],
            countryId: country.id,
            cityId: city.id,
            areaId: area.id,
            latitude: prop.coordinates.latitude,
            longitude: prop.coordinates.longitude,
            description: prop.description || '',
            price: priceUSD,
            bedrooms: prop.bedrooms && prop.bedrooms.toString().toLowerCase().includes('studio') 
              ? 0 
              : (isNaN(parseInt(prop.bedrooms?.toString())) ? undefined : parseInt(prop.bedrooms.toString())),
            bathrooms: isNaN(parseInt(prop.bathrooms?.toString())) ? undefined : parseInt(prop.bathrooms.toString()),
            size: sizeSQM || undefined,
            
            // Нові поля для повного мапінгу
            externalId: prop.id,
            propertyUrl: prop.url,
            buildingName: prop.buildingName,
            communityName: prop.communityName,
            displayAddress: prop.displayAddress,
            addedOn: prop.addedOn,
            verified: prop.verified || false,
            reference: prop.reference,
            rera: prop.rera,
            furnishing: prop.furnishing,
            agentName: prop.agent,
            agentPhone: prop.agentPhone,
            agentWhatsapp: prop.agentWhatsapp,
            agentEmail: prop.agentEmail,
            agentInfo: prop.agentInfo,
            brokerName: prop.brokerInfo?.name,
            brokerLogo: prop.brokerInfo?.logo,
            brokerInfo: prop.brokerInfo,
            priceDuration: prop.priceDuration,
            propertySubType: prop.propertyType,
            priceCurrency: prop.priceCurrency,
            type: prop.type,
            sizeMin: prop.sizeMin?.toString(),
          })
          .returning('id')
          .execute();

        const propertyId = insertResult.identifiers[0].id;

        // Додаємо facilities
        if (facilities.length > 0) {
          const facilityIds = facilities.map(f => f.id);
          await propertyRepo
            .createQueryBuilder()
            .relation(Property, 'facilities')
            .of(propertyId)
            .add(facilityIds);
        }
        successCount++;

        if ((i + 1) % 100 === 0) {
          console.log(`   Оброблено: ${i + 1}/${properties.length} (успішно: ${successCount}, помилок: ${errorCount})...`);
        }
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Об'єкт ${i + 1} (${prop.title}): ${error.message}`;
        errors.push(errorMsg);
        if (errorCount <= 10) {
          console.error(`❌ ${errorMsg}`);
        }
      }
    }

    console.log('\n📈 Підсумок імпорту:');
    console.log(`   ✅ Успішно: ${successCount}`);
    console.log(`   ❌ Помилок: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n📋 Перші 20 помилок:');
      errors.slice(0, 20).forEach(err => console.log(`   - ${err}`));
    }

    await AppDataSource.destroy();
    console.log('\n✅ Імпорт завершено!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Помилка імпорту:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

importSecondaryProperties();
