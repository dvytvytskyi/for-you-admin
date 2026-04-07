import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { Country } from '../entities/Country';
import { City } from '../entities/City';
import { Area } from '../entities/Area';
import { Developer } from '../entities/Developer';
import { PropertyUnit, UnitType } from '../entities/PropertyUnit';

async function createTestProperties() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const countryRepo = AppDataSource.getRepository(Country);
    const cityRepo = AppDataSource.getRepository(City);
    const areaRepo = AppDataSource.getRepository(Area);
    const developerRepo = AppDataSource.getRepository(Developer);
    const propertyRepo = AppDataSource.getRepository(Property);
    const unitRepo = AppDataSource.getRepository(PropertyUnit);

    // Отримуємо або створюємо UAE
    let country = await countryRepo.findOne({ where: { code: 'AE' } });
    if (!country) {
      country = await countryRepo.save({
        nameEn: 'United Arab Emirates',
        nameRu: 'Объединенные Арабские Эмираты',
        nameAr: 'الإمارات العربية المتحدة',
        code: 'AE',
      });
      console.log('✅ Created UAE');
    } else {
      console.log('✅ UAE already exists');
    }

    // Отримуємо або створюємо Dubai
    let city = await cityRepo.findOne({ where: { countryId: country.id, nameEn: 'Dubai' } });
    if (!city) {
      city = await cityRepo.save({
        countryId: country.id,
        nameEn: 'Dubai',
        nameRu: 'Дубай',
        nameAr: 'دبي',
      });
      console.log('✅ Created Dubai');
    } else {
      console.log('✅ Dubai already exists');
    }

    // Отримуємо або створюємо Area (Downtown Dubai)
    let area = await areaRepo.findOne({ where: { cityId: city.id, nameEn: 'Downtown Dubai' } });
    if (!area) {
      area = await areaRepo.save({
        cityId: city.id,
        nameEn: 'Downtown Dubai',
        nameRu: 'Даунтаун Дубай',
        nameAr: 'دبي داون تاون',
      });
      console.log('✅ Created Downtown Dubai area');
    } else {
      console.log('✅ Downtown Dubai area already exists');
    }

    // Отримуємо або створюємо Developer
    let developer = await developerRepo.findOne({ where: { name: 'Emaar Properties' } });
    if (!developer) {
      developer = await developerRepo.save({
        name: 'Emaar Properties',
        logo: '',
        description: 'Leading real estate developer in Dubai',
      });
      console.log('✅ Created Emaar Properties developer');
    } else {
      console.log('✅ Emaar Properties developer already exists');
    }

    // Створюємо тестові properties
    console.log('\n📦 Створюю тестові properties...\n');

    // 1. Off-Plan Property - Luxury Residences
    const offPlanProperty = await propertyRepo.save({
      propertyType: PropertyType.OFF_PLAN,
      name: 'Luxury Residences Downtown',
      photos: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      ],
      countryId: country.id,
      cityId: city.id,
      areaId: area.id,
      developerId: developer.id,
      latitude: 25.1972,
      longitude: 55.2744,
      description: 'Experience luxury living in the heart of Dubai. This stunning off-plan development offers world-class amenities, breathtaking views, and premium finishes. Located in Downtown Dubai, just minutes away from the iconic Burj Khalifa and Dubai Mall.',
      priceFrom: 500000,
      bedroomsFrom: 1,
      bedroomsTo: 3,
      bathroomsFrom: 1,
      bathroomsTo: 3,
      sizeFrom: 50,
      sizeTo: 150,
      paymentPlan: '70/30 - 70% during construction, 30% on handover',
    });

    // Створюємо units для off-plan property
    await unitRepo.save({
      propertyId: offPlanProperty.id,
      unitId: 'A-101',
      type: UnitType.APARTMENT,
      price: 500000,
      totalSize: 50,
      balconySize: 5,
      planImage: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    });
    await unitRepo.save({
      propertyId: offPlanProperty.id,
      unitId: 'A-102',
      type: UnitType.APARTMENT,
      price: 750000,
      totalSize: 100,
      balconySize: 10,
      planImage: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    });
    await unitRepo.save({
      propertyId: offPlanProperty.id,
      unitId: 'B-201',
      type: UnitType.PENTHOUSE,
      price: 1500000,
      totalSize: 150,
      balconySize: 20,
      planImage: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    });

    console.log(`✅ Created Off-Plan Property: ${offPlanProperty.name} (ID: ${offPlanProperty.id})`);

    // 2. Secondary Property - Modern Apartment
    const secondaryProperty = await propertyRepo.save({
      propertyType: PropertyType.SECONDARY,
      name: 'Modern Apartment in Downtown',
      photos: [
        'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
      ],
      countryId: country.id,
      cityId: city.id,
      areaId: area.id,
      developerId: developer.id,
      latitude: 25.2048,
      longitude: 55.2708,
      description: 'Beautifully renovated modern apartment in the heart of Downtown Dubai. Features high-end finishes, spacious living areas, and stunning city views. Perfect for families or professionals seeking luxury living.',
      priceFrom: 750000,
      priceTo: 750000,
      bedroomsFrom: 2,
      bedroomsTo: 2,
      bathroomsFrom: 2,
      bathroomsTo: 2,
      sizeFrom: 120,
      sizeTo: 120,
    });

    console.log(`✅ Created Secondary Property: ${secondaryProperty.name} (ID: ${secondaryProperty.id})`);

    // 3. Off-Plan Property - Beachfront Residences
    // Створюємо або отримуємо Palm Jumeirah area
    let palmArea = await areaRepo.findOne({ where: { cityId: city.id, nameEn: 'Palm Jumeirah' } });
    if (!palmArea) {
      palmArea = await areaRepo.save({
        cityId: city.id,
        nameEn: 'Palm Jumeirah',
        nameRu: 'Пальм Джумейра',
        nameAr: 'نخلة جميرا',
      });
      console.log('✅ Created Palm Jumeirah area');
    }

    const beachfrontProperty = await propertyRepo.save({
      propertyType: PropertyType.OFF_PLAN,
      name: 'Beachfront Residences Palm Jumeirah',
      photos: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
      ],
      countryId: country.id,
      cityId: city.id,
      areaId: palmArea.id,
      developerId: developer.id,
      latitude: 25.1128,
      longitude: 55.1390,
      description: 'Exclusive beachfront development on the iconic Palm Jumeirah. Enjoy direct beach access, private pools, and panoramic views of the Arabian Gulf. This premium off-plan project offers the ultimate luxury lifestyle.',
      priceFrom: 1200000,
      bedroomsFrom: 2,
      bedroomsTo: 4,
      bathroomsFrom: 2,
      bathroomsTo: 4,
      sizeFrom: 150,
      sizeTo: 300,
      paymentPlan: '60/40 - 60% during construction, 40% on handover',
    });

    // Створюємо units для beachfront property
    await unitRepo.save({
      propertyId: beachfrontProperty.id,
      unitId: 'V-301',
      type: UnitType.VILLA,
      price: 1200000,
      totalSize: 150,
      balconySize: 30,
      planImage: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    });
    await unitRepo.save({
      propertyId: beachfrontProperty.id,
      unitId: 'V-302',
      type: UnitType.VILLA,
      price: 2000000,
      totalSize: 250,
      balconySize: 50,
      planImage: 'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    });

    console.log(`✅ Created Off-Plan Property: ${beachfrontProperty.name} (ID: ${beachfrontProperty.id})`);

    console.log('\n✅ Всі тестові properties створені успішно!');
    console.log('\n📋 Створені properties:');
    console.log(`   1. ${offPlanProperty.name} (Off-Plan) - ID: ${offPlanProperty.id}`);
    console.log(`   2. ${secondaryProperty.name} (Secondary) - ID: ${secondaryProperty.id}`);
    console.log(`   3. ${beachfrontProperty.name} (Off-Plan) - ID: ${beachfrontProperty.id}`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating test properties:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

createTestProperties();

