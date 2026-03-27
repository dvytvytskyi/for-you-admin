import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { Country } from '../entities/Country';
import { City } from '../entities/City';
import { Area } from '../entities/Area';
import { Facility } from '../entities/Facility';
import * as fs from 'fs';
import * as path from 'path';

interface ScraperProperty {
  id: string;
  url: string;
  title: string;
  displayAddress: string;
  buildingName?: string;
  communityName?: string;
  bedrooms?: string;
  bathrooms?: string;
  addedOn?: string;
  broker?: string;
  agent?: string;
  agentInfo?: {
    image?: string;
    name?: string;
    email?: string;
    slug?: string;
  };
  agentPhone?: string;
  agentWhatsapp?: string;
  agentEmail?: string;
  verified?: boolean;
  reference?: string;
  brokerInfo?: {
    logo?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  propertyType?: string;
  price?: number;
  rera?: string;
  priceCurrency?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  size?: number;
  furnishing?: string;
  features?: string[];
  description?: string;
  images?: string[];
}

const SQM_TO_SQFT = 10.764;
const USD_TO_AED = 3.67;

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

async function importFullSecondaryProperties() {
  try {
    console.log('🔄 Підключення до БД...');
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const propertyRepo = AppDataSource.getRepository(Property);
    const countryRepo = AppDataSource.getRepository(Country);
    const cityRepo = AppDataSource.getRepository(City);
    const areaRepo = AppDataSource.getRepository(Area);
    const facilityRepo = AppDataSource.getRepository(Facility);

    console.log('🧹 Очищення старих secondary проектів...');
    await AppDataSource.query(`
      DELETE FROM "portfolio_items" WHERE "propertyId" IN (SELECT id FROM properties WHERE "propertyType" = 'secondary');
      DELETE FROM "property_units" WHERE "propertyId" IN (SELECT id FROM properties WHERE "propertyType" = 'secondary');
      DELETE FROM properties WHERE "propertyType" = 'secondary';
    `);
    console.log(`✅ Очищено\n`);

    const jsonPath = path.resolve(__dirname, '../../../dataset_propertyfinder-scraper_2025-11-03_17-07-17-191.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Файл не знайдено: ${jsonPath}`);
    }

    console.log('📖 Читання файлу...');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const properties: ScraperProperty[] = JSON.parse(jsonContent);
    console.log(`   Знайдено ${properties.length} об'єктів\n`);

    // Знаходимо або створюємо UAE та Dubai
    let country = await countryRepo.findOne({ where: { code: 'AE' } });
    if (!country) {
      country = await countryRepo.save({
        nameEn: 'United Arab Emirates',
        nameRu: 'Объединенные Арабские Эмираты',
        nameAr: 'الإمارات العربية المتحدة',
        code: 'AE',
      });
    }

    let city = await cityRepo.findOne({ where: { nameEn: 'Dubai', countryId: country.id } });
    if (!city) {
      city = await cityRepo.save({
        nameEn: 'Dubai',
        nameRu: 'Дубай',
        nameAr: 'دبي',
        countryId: country.id,
      });
    }

    const areaCache = new Map<string, Area>();
    const facilityCache = new Map<string, Facility>();
    const existingFacilities = await facilityRepo.find();
    existingFacilities.forEach(f => facilityCache.set(f.nameEn.toLowerCase(), f));

    let successCount = 0;
    let errorCount = 0;

    console.log('🔄 Імпорт об\'єктів...\n');

    for (let i = 0; i < properties.length; i++) {
      const prop = properties[i];

      try {
        if (!prop.title || !prop.images || prop.images.length === 0) continue;
        if (!prop.coordinates || !prop.coordinates.latitude || !prop.coordinates.longitude) continue;

        let priceUSD = prop.price || 0;
        if (prop.priceCurrency === 'AED') {
          priceUSD = priceUSD / USD_TO_AED;
        }

        const sizeSQM = prop.size ? prop.size / SQM_TO_SQFT : undefined;
        const areaName = prop.communityName || prop.displayAddress || 'Dubai';
        
        // Мапінг Area
        let area = areaCache.get(areaName);
        if (!area) {
          area = await areaRepo.findOne({ where: { cityId: city.id, nameEn: areaName } }) || undefined;
          if (!area) {
            area = await areaRepo.save({
              cityId: city.id,
              nameEn: areaName,
              nameRu: areaName,
              nameAr: areaName,
            });
          }
          areaCache.set(areaName, area);
        }

        // Обробка Facilities
        const facilities: Facility[] = [];
        if (prop.features && prop.features.length > 0) {
          for (const feature of prop.features) {
            const facilityName = featureToFacilityMap[feature] || feature;
            const facilityKey = facilityName.toLowerCase();
            let facility = facilityCache.get(facilityKey);
            if (!facility) {
              facility = await facilityRepo.findOne({ where: { nameEn: facilityName } }) || undefined;
              if (!facility) {
                facility = await facilityRepo.save({
                  nameEn: facilityName,
                  nameRu: facilityName,
                  nameAr: facilityName,
                  iconName: 'checkmark-circle',
                });
              }
              facilityCache.set(facilityKey, facility);
            }
            if (facility) facilities.push(facility);
          }
        }

        // Створення Property
        const property = await propertyRepo.save({
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
          bedrooms: (prop.bedrooms && !isNaN(parseInt(prop.bedrooms))) ? parseInt(prop.bedrooms) : undefined,
          bathrooms: (prop.bathrooms && !isNaN(parseInt(prop.bathrooms))) ? parseInt(prop.bathrooms) : undefined,
          size: sizeSQM,
          
          // Нові поля
          externalId: prop.id,
          propertyUrl: prop.url,
          buildingName: prop.buildingName,
          communityName: prop.communityName,
          verified: prop.verified || false,
          reference: prop.reference,
          rera: prop.rera,
          furnishing: prop.furnishing,
          agentName: prop.agent || prop.agentInfo?.name || '',
          agentPhone: prop.agentPhone || '',
          agentWhatsapp: prop.agentWhatsapp || '',
          agentEmail: prop.agentEmail || prop.agentInfo?.email || '',
          agentPhoto: prop.agentInfo?.image || '',
          brokerName: prop.broker || prop.brokerInfo?.name || '',
          brokerLogo: prop.brokerInfo?.logo || '',
          
          isActive: true,
          facilities: facilities
        });

        successCount++;
        if ((i + 1) % 100 === 0) {
          console.log(`   Оброблено: ${i + 1}/${properties.length} (Успішно: ${successCount})`);
        }
      } catch (err: any) {
        errorCount++;
        console.error(`❌ Помилка на ${i + 1}:`, err.message);
      }
    }

    console.log(`\n✅ Імпорт завершено! Успішно: ${successCount}, Помилок: ${errorCount}`);
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

importFullSecondaryProperties();
