import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property, PropertyType } from './src/entities/Property';

async function getStats() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const totalSecondary = await repo.count({ where: { propertyType: PropertyType.SECONDARY } });
    const secondaryNoPhotos = await repo.count({ 
        where: { 
            propertyType: PropertyType.SECONDARY,
            photos: '' // or null, but we saw it's text
        } 
    });
    
    // Also check for empty arrays represented as string
    const secondaryEmptyPhotos = await repo.createQueryBuilder('p')
        .where('p.propertyType = :type', { type: PropertyType.SECONDARY })
        .andWhere("(p.photos IS NULL OR p.photos = '' OR p.photos = '{}' OR p.photos = '[]')")
        .getCount();

    const offPlanWithPhotos = await repo.createQueryBuilder('p')
        .where('p.propertyType = :type', { type: PropertyType.OFF_PLAN })
        .andWhere("p.photos IS NOT NULL AND p.photos != '' AND p.photos != '{}' AND p.photos != '[]'")
        .getCount();

    console.log(`--- DB STATS ---`);
    console.log(`Total Secondary: ${totalSecondary}`);
    console.log(`Secondary without photos: ${secondaryEmptyPhotos}`);
    console.log(`Off-Plan with photos: ${offPlanWithPhotos}`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

getStats();
