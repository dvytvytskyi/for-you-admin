import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function checkOffPlanDataIssues() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const repo = AppDataSource.getRepository(Property);
    
    // Get all off-plan properties
    const allOffPlan = await repo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      relations: ['country', 'city', 'area', 'developer'],
    });
    
    console.log(`\n📊 Загальна кількість off-plan: ${allOffPlan.length}`);
    
    // Check properties without bedrooms
    const withoutBedrooms = allOffPlan.filter(p => 
      p.bedroomsFrom === null || p.bedroomsFrom === undefined ||
      p.bedroomsTo === null || p.bedroomsTo === undefined
    );
    
    console.log(`\n🛏️  Properties без bedroomsFrom/bedroomsTo: ${withoutBedrooms.length}`);
    if (withoutBedrooms.length > 0) {
      console.log(`   Приклади (перші 5):`);
      withoutBedrooms.slice(0, 5).forEach(p => {
        console.log(`   - ${p.name}: bedroomsFrom=${p.bedroomsFrom}, bedroomsTo=${p.bedroomsTo}`);
      });
    }
    
    // Check properties without size
    const withoutSize = allOffPlan.filter(p => 
      p.sizeFrom === null || p.sizeFrom === undefined ||
      p.sizeTo === null || p.sizeTo === undefined
    );
    
    console.log(`\n📐 Properties без sizeFrom/sizeTo: ${withoutSize.length}`);
    if (withoutSize.length > 0) {
      console.log(`   Приклади (перші 5):`);
      withoutSize.slice(0, 5).forEach(p => {
        console.log(`   - ${p.name}: sizeFrom=${p.sizeFrom}, sizeTo=${p.sizeTo}`);
      });
    }
    
    // Check properties without photos
    const withoutPhotos = allOffPlan.filter(p => 
      !p.photos || !Array.isArray(p.photos) || p.photos.length === 0
    );
    
    console.log(`\n📸 Properties без фото: ${withoutPhotos.length}`);
    if (withoutPhotos.length > 0) {
      console.log(`   Приклади (перші 10):`);
      withoutPhotos.slice(0, 10).forEach(p => {
        console.log(`   - ${p.name}: photos=${p.photos ? (Array.isArray(p.photos) ? p.photos.length : 'not array') : 'null'}`);
      });
    }
    
    // Check properties with photos but empty array
    const withEmptyPhotos = allOffPlan.filter(p => 
      Array.isArray(p.photos) && p.photos.length === 0
    );
    console.log(`   Properties з пустим масивом фото: ${withEmptyPhotos.length}`);
    
    // Check properties with null photos
    const withNullPhotos = allOffPlan.filter(p => 
      p.photos === null || p.photos === undefined
    );
    console.log(`   Properties з null фото: ${withNullPhotos.length}`);
    
    // Check sample properties
    console.log(`\n📋 Приклади properties (перші 10):`);
    allOffPlan.slice(0, 10).forEach((p, index) => {
      console.log(`\n   ${index + 1}. ${p.name}`);
      console.log(`      - Photos: ${Array.isArray(p.photos) ? p.photos.length : 'N/A'} фото`);
      console.log(`      - BedroomsFrom: ${p.bedroomsFrom ?? 'null'}`);
      console.log(`      - BedroomsTo: ${p.bedroomsTo ?? 'null'}`);
      console.log(`      - SizeFrom: ${p.sizeFrom ?? 'null'}`);
      console.log(`      - SizeTo: ${p.sizeTo ?? 'null'}`);
      console.log(`      - PriceFrom: ${p.priceFrom ?? 'null'}`);
      console.log(`      - Area: ${p.area?.nameEn ?? 'N/A'}`);
      console.log(`      - City: ${p.city?.nameEn ?? 'N/A'}`);
    });
    
    // Simulate API query with filters (like frontend might do)
    console.log(`\n🔍 Симуляція API запиту (як фронтенд):`);
    const queryBuilder = repo
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.country', 'country')
      .leftJoinAndSelect('property.city', 'city')
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('property.developer', 'developer')
      .leftJoinAndSelect('property.facilities', 'facilities')
      .leftJoinAndSelect('property.units', 'units')
      .where('property.propertyType = :type', { type: PropertyType.OFF_PLAN });
    
    // Check if there are any filters that might reduce count
    const totalCount = await queryBuilder.getCount();
    console.log(`   Total count без фільтрів: ${totalCount}`);
    
    // Check with pagination
    queryBuilder.skip(0).take(36);
    const pageProperties = await queryBuilder.getMany();
    console.log(`   Properties на першій сторінці (36): ${pageProperties.length}`);
    
    const pageWithoutPhotos = pageProperties.filter(p => 
      !p.photos || !Array.isArray(p.photos) || p.photos.length === 0
    );
    console.log(`   Properties без фото на першій сторінці: ${pageWithoutPhotos.length}`);
    
    const pageWithoutBedrooms = pageProperties.filter(p => 
      p.bedroomsFrom === null || p.bedroomsTo === null
    );
    console.log(`   Properties без bedrooms на першій сторінці: ${pageWithoutBedrooms.length}`);
    
    const pageWithoutSize = pageProperties.filter(p => 
      p.sizeFrom === null || p.sizeTo === null
    );
    console.log(`   Properties без size на першій сторінці: ${pageWithoutSize.length}`);
    
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

checkOffPlanDataIssues();

