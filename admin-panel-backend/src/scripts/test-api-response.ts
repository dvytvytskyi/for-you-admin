import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { Conversions } from '../utils/conversions';

async function testAPIResponse() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const repo = AppDataSource.getRepository(Property);
    
    // Simulate exact API query
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
      .take(36);
    
    const totalCount = await queryBuilder.getCount();
    const properties = await queryBuilder.getMany();
    
    console.log(`\n📊 API Response Simulation:`);
    console.log(`   Total count: ${totalCount}`);
    console.log(`   Properties loaded: ${properties.length}`);
    
    // Transform like API does
    const propertiesWithConversions = properties.map(p => {
      let areaField: any = p.area;
      if (p.area && p.propertyType === 'off-plan') {
        const areaName = p.area.nameEn || '';
        const cityName = p.city?.nameEn || '';
        areaField = cityName ? `${areaName}, ${cityName}` : areaName;
      }

      return {
        ...p,
        area: areaField,
        priceFromAED: p.priceFrom ? Conversions.usdToAed(p.priceFrom) : null,
        priceAED: p.price ? Conversions.usdToAed(p.price) : null,
        sizeFromSqft: p.sizeFrom ? Conversions.sqmToSqft(p.sizeFrom) : null,
        sizeToSqft: p.sizeTo ? Conversions.sqmToSqft(p.sizeTo) : null,
        sizeSqft: p.size ? Conversions.sqmToSqft(p.size) : null,
      };
    });
    
    // Count properties with null values
    const withNullBedrooms = propertiesWithConversions.filter(p => 
      p.bedroomsFrom === null || p.bedroomsFrom === undefined ||
      p.bedroomsTo === null || p.bedroomsTo === undefined
    ).length;
    
    const withNullSize = propertiesWithConversions.filter(p => 
      p.sizeFrom === null || p.sizeFrom === undefined ||
      p.sizeTo === null || p.sizeTo === undefined
    ).length;
    
    const withNullPhotos = propertiesWithConversions.filter(p => 
      !p.photos || !Array.isArray(p.photos) || p.photos.length === 0
    ).length;
    
    console.log(`\n📋 Statistics on first page (36 properties):`);
    console.log(`   With null bedrooms: ${withNullBedrooms}`);
    console.log(`   With null size: ${withNullSize}`);
    console.log(`   With null/empty photos: ${withNullPhotos}`);
    
    // Show sample properties
    console.log(`\n📋 Sample properties (first 5):`);
    propertiesWithConversions.slice(0, 5).forEach((p, index) => {
      console.log(`\n   ${index + 1}. ${p.name}`);
      console.log(`      - BedroomsFrom: ${p.bedroomsFrom ?? 'null'}`);
      console.log(`      - BedroomsTo: ${p.bedroomsTo ?? 'null'}`);
      console.log(`      - SizeFrom: ${p.sizeFrom ?? 'null'} (${p.sizeFromSqft ? p.sizeFromSqft.toFixed(2) : 'null'} sqft)`);
      console.log(`      - SizeTo: ${p.sizeTo ?? 'null'} (${p.sizeToSqft ? p.sizeToSqft.toFixed(2) : 'null'} sqft)`);
      console.log(`      - PriceFrom: ${p.priceFrom ?? 'null'} (${p.priceFromAED ? p.priceFromAED.toFixed(2) : 'null'} AED)`);
      console.log(`      - Photos: ${Array.isArray(p.photos) ? p.photos.length : 0} фото`);
    });
    
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

testAPIResponse();

