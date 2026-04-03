import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property, PropertyType } from './src/entities/Property';

async function analyzeSecondaryDuplicates() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const properties = await repo.find({ 
      where: { propertyType: PropertyType.SECONDARY },
      select: ['id', 'name', 'photos', 'buildingName']
    });

    const fingerprintCounts: Record<string, string[]> = {};
    properties.forEach(p => {
        const fp = p.photos as any; // Just use the raw string from DB
        if (!fp || fp === '' || fp === '[]' || fp === '{}') return;
        if (!fingerprintCounts[fp]) {
            fingerprintCounts[fp] = [];
        }
        fingerprintCounts[fp].push(p.name + ' (' + p.buildingName + ')');
    });

    const duplicates = Object.entries(fingerprintCounts)
      .filter(([fp, names]) => names.length > 5)
      .sort((a, b) => b[1].length - a[1].length);

    console.log(`--- SECONDARY DUPLICATES ANALYSIS ---`);
    console.log(`Total secondary with photos: ${Object.keys(fingerprintCounts).length}`);
    console.log(`Common sets of photos used across multiple objects: ${duplicates.length}`);
    
    duplicates.slice(0, 10).forEach(([fp, names]) => {
      console.log(`\nPhotos string length: ${fp.length}`);
      console.log(`Found in: ${names.length} properties`);
      console.log(`Example objects: ${names.slice(0, 5).join(', ')}`);
      console.log(`Content start: ${fp.slice(0, 100)}...`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

analyzeSecondaryDuplicates();
