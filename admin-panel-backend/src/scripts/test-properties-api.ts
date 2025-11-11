import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function testPropertiesAPI() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const repo = AppDataSource.getRepository(Property);
    
    // Test 1: Get off-plan properties with relations
    console.log('\n📊 Тест 1: Отримання off-plan properties з relations');
    const offPlanProperties = await repo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      relations: ['country', 'city', 'area', 'developer', 'facilities', 'units'],
      take: 5,
      order: { createdAt: 'DESC' }
    });
    
    console.log(`   Знайдено: ${offPlanProperties.length} properties`);
    if (offPlanProperties.length > 0) {
      const sample = offPlanProperties[0];
      console.log(`\n   Приклад property:`);
      console.log(`   - ID: ${sample.id}`);
      console.log(`   - Name: ${sample.name}`);
      console.log(`   - PropertyType: ${sample.propertyType}`);
      console.log(`   - Photos: ${Array.isArray(sample.photos) ? sample.photos.length : 'N/A'} фото`);
      console.log(`   - Country: ${sample.country?.nameEn || 'N/A'}`);
      console.log(`   - City: ${sample.city?.nameEn || 'N/A'}`);
      console.log(`   - Area: ${sample.area?.nameEn || 'N/A'}`);
      console.log(`   - Developer: ${sample.developer?.name || 'N/A'}`);
      console.log(`   - Facilities: ${sample.facilities?.length || 0}`);
      console.log(`   - Units: ${sample.units?.length || 0}`);
      console.log(`   - PriceFrom: ${sample.priceFrom || 'N/A'}`);
      console.log(`   - BedroomsFrom: ${sample.bedroomsFrom || 'N/A'}`);
      console.log(`   - BedroomsTo: ${sample.bedroomsTo || 'N/A'}`);
      console.log(`   - SizeFrom: ${sample.sizeFrom || 'N/A'}`);
      console.log(`   - SizeTo: ${sample.sizeTo || 'N/A'}`);
      console.log(`   - Description: ${sample.description ? sample.description.substring(0, 50) + '...' : 'N/A'}`);
    }
    
    // Test 2: Check properties with missing relations
    console.log('\n📊 Тест 2: Перевірка properties з відсутніми relations');
    const propertiesWithoutArea = await repo
      .createQueryBuilder('p')
      .leftJoin('p.area', 'area')
      .where('p.propertyType = :type', { type: PropertyType.OFF_PLAN })
      .andWhere('area.id IS NULL')
      .getCount();
    
    console.log(`   Properties без area: ${propertiesWithoutArea}`);
    
    const propertiesWithoutCity = await repo
      .createQueryBuilder('p')
      .leftJoin('p.city', 'city')
      .where('p.propertyType = :type', { type: PropertyType.OFF_PLAN })
      .andWhere('city.id IS NULL')
      .getCount();
    
    console.log(`   Properties без city: ${propertiesWithoutCity}`);
    
    const propertiesWithoutCountry = await repo
      .createQueryBuilder('p')
      .leftJoin('p.country', 'country')
      .where('p.propertyType = :type', { type: PropertyType.OFF_PLAN })
      .andWhere('country.id IS NULL')
      .getCount();
    
    console.log(`   Properties без country: ${propertiesWithoutCountry}`);
    
    // Test 3: Check properties with empty photos
    console.log('\n📊 Тест 3: Перевірка properties з фото');
    const allOffPlan = await repo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'photos']
    });
    
    const withPhotos = allOffPlan.filter(p => 
      p.photos && Array.isArray(p.photos) && p.photos.length > 0
    ).length;
    
    const withoutPhotos = allOffPlan.length - withPhotos;
    
    console.log(`   Properties з фото: ${withPhotos}`);
    console.log(`   Properties без фото: ${withoutPhotos}`);
    
    if (allOffPlan.length > 0 && allOffPlan[0].photos) {
      console.log(`   Приклад фото (перше property): ${Array.isArray(allOffPlan[0].photos) ? allOffPlan[0].photos[0] : 'N/A'}`);
    }
    
    // Test 4: Simulate API query
    console.log('\n📊 Тест 4: Симуляція API запиту (як у properties.routes.ts)');
    const queryBuilder = repo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.country', 'country')
      .leftJoinAndSelect('property.city', 'city')
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('property.developer', 'developer')
      .leftJoinAndSelect('property.facilities', 'facilities')
      .leftJoinAndSelect('property.units', 'units')
      .where('property.propertyType = :type', { type: PropertyType.OFF_PLAN })
      .orderBy('property.createdAt', 'DESC')
      .skip(0)
      .take(10);
    
    const apiProperties = await queryBuilder.getMany();
    const totalCount = await queryBuilder.getCount();
    
    console.log(`   Total count: ${totalCount}`);
    console.log(`   Loaded properties: ${apiProperties.length}`);
    
    if (apiProperties.length > 0) {
      const apiSample = apiProperties[0];
      console.log(`\n   Приклад API response:`);
      console.log(`   - Name: ${apiSample.name}`);
      console.log(`   - Area: ${apiSample.area?.nameEn || 'N/A'}`);
      console.log(`   - City: ${apiSample.city?.nameEn || 'N/A'}`);
      console.log(`   - Area field (для off-plan): "${apiSample.area?.nameEn || ''}, ${apiSample.city?.nameEn || ''}"`);
    }
    
    await AppDataSource.destroy();
    console.log('\n✅ Done');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

testPropertiesAPI();

