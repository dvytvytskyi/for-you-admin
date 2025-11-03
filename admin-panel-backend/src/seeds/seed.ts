import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Country } from '../entities/Country';
import { City } from '../entities/City';
import { Area } from '../entities/Area';
import { Facility } from '../entities/Facility';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Create UAE
    const countryRepo = AppDataSource.getRepository(Country);
    const existingCountry = await countryRepo.findOne({ where: { code: 'AE' } });
    
    let country;
    if (!existingCountry) {
      country = await countryRepo.save({
        nameEn: 'United Arab Emirates',
        nameRu: 'Объединенные Арабские Эмираты',
        nameAr: 'الإمارات العربية المتحدة',
        code: 'AE',
      });
      console.log('✅ Created UAE');
    } else {
      country = existingCountry;
      console.log('✅ UAE already exists');
    }

    // Create Dubai
    const cityRepo = AppDataSource.getRepository(City);
    const existingCity = await cityRepo.findOne({ where: { countryId: country.id, nameEn: 'Dubai' } });
    
    let city;
    if (!existingCity) {
      city = await cityRepo.save({
        countryId: country.id,
        nameEn: 'Dubai',
        nameRu: 'Дубай',
        nameAr: 'دبي',
      });
      console.log('✅ Created Dubai');
    } else {
      city = existingCity;
      console.log('✅ Dubai already exists');
    }

    // Create Areas
    const areaRepo = AppDataSource.getRepository(Area);
    const areaNames = [
      'Downtown Dubai', 'Palm Jumeirah', 'Dubai Marina', 'JBR',
      'Business Bay', 'JLT', 'Arabian Ranches', 'Dubai Hills'
    ];
    
    for (const areaName of areaNames) {
      const existingArea = await areaRepo.findOne({ 
        where: { cityId: city.id, nameEn: areaName } 
      });
      
      if (!existingArea) {
        await areaRepo.save({
          cityId: city.id,
          nameEn: areaName,
          nameRu: areaName,
          nameAr: areaName,
        });
        console.log(`✅ Created area: ${areaName}`);
      }
    }

    // Create Facilities
    const facilityRepo = AppDataSource.getRepository(Facility);
    const facilities = [
      { nameEn: 'Swimming Pool', iconName: 'water' },
      { nameEn: 'Gym', iconName: 'fitness' },
      { nameEn: 'Parking', iconName: 'car' },
      { nameEn: '24/7 Security', iconName: 'shield-checkmark' },
      { nameEn: 'Kids Play Area', iconName: 'happy' },
      { nameEn: 'BBQ Area', iconName: 'flame' },
    ];

    for (const facility of facilities) {
      const existing = await facilityRepo.findOne({ where: { nameEn: facility.nameEn } });
      if (!existing) {
        await facilityRepo.save({
          ...facility,
          nameRu: facility.nameEn,
          nameAr: facility.nameEn,
        });
        console.log(`✅ Created facility: ${facility.nameEn}`);
      }
    }

    console.log('✅ Seed completed successfully');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

seed();

