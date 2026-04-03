import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property, PropertyType } from './src/entities/Property';

function parsePhotos(photos: any): string[] {
  if (!photos) return [];
  if (Array.isArray(photos)) return photos;
  if (typeof photos === 'string') {
    return photos.split(',').map(p => p.trim()).filter(p => !!p);
  }
  return [];
}

async function checkOverlap() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    // 1. Get all Off-Plan photo URLs
    const offPlan = await repo.find({ 
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['photos']
    });

    const projectPhotoSet = new Set<string>();
    offPlan.forEach(p => {
      const photos = parsePhotos(p.photos);
      photos.forEach(url => projectPhotoSet.add(url));
    });

    console.log(`Total project photos available for mapping: ${projectPhotoSet.size}`);

    // 2. Check each Secondary property
    const secondary = await repo.find({
      where: { propertyType: PropertyType.SECONDARY },
      select: ['id', 'photos']
    });

    let mappedCount = 0;
    secondary.forEach(s => {
      const photos = parsePhotos(s.photos);
      const hasProjectPhoto = photos.some(url => projectPhotoSet.has(url));
      if (hasProjectPhoto) {
        mappedCount++;
      }
    });

    console.log(`--- RESULTS ---`);
    console.log(`Total Secondary properties: ${secondary.length}`);
    console.log(`Mapped (has at least one project photo): ${mappedCount}`);
    console.log(`Mapping rate: ${((mappedCount/secondary.length)*100).toFixed(2)}%`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkOverlap();
