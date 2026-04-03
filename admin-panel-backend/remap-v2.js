const { AppDataSource } = require('./dist/config/database');
const { Property } = require('./dist/entities/Property');

async function remapPhotos() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const propertyRepo = AppDataSource.getRepository(Property);

    // 1. Get all Off-plan projects
    const offPlanProjects = await propertyRepo.createQueryBuilder('p')
      .where('p.propertyType = :type', { type: 'off-plan' })
      .getMany();
    
    console.log(`📊 Found ${offPlanProjects.length} Off-plan projects to use as photo sources.`);

    // 2. Get all Secondary properties
    const secondaryProperties = await propertyRepo.createQueryBuilder('p')
      .where('p.propertyType = :type', { type: 'secondary' })
      .getMany();

    console.log(`🔍 Checking ${secondaryProperties.length} Secondary properties for mapping.`);

    let mappedCount = 0;
    
    // Sort off-plan properties by name length descending to match longest specific names first (e.g. 'Dubai Hills Estate' vs 'Dubai')
    offPlanProjects.sort((a, b) => b.name.length - a.name.length);

    // For bulk updates optimization
    const batchSize = 100;
    let saveBatch = [];

    for (const prop of secondaryProperties) {
      let foundSource = null;
      
      const propDesc = (prop.description || '').toLowerCase();
      const propName = (prop.name || '').toLowerCase();

      // Find the best match
      for (const offPlan of offPlanProjects) {
        const offPlanName = (offPlan.name || '').toLowerCase().trim();
        if (offPlanName.length < 4) continue; // skip too short names to avoid false positives

        if (propName.includes(offPlanName) || propDesc.includes(offPlanName)) {
          foundSource = offPlan;
          break; // found the match
        }
      }

      if (foundSource && foundSource.photos && foundSource.photos.length > 0) {
        // Did we actually change anything?
        const oldPhotosStr = JSON.stringify(prop.photos || []);
        const newPhotosStr = JSON.stringify(foundSource.photos);
        
        if (oldPhotosStr !== newPhotosStr) {
          prop.photos = foundSource.photos;
          saveBatch.push(prop);
          mappedCount++;
        }
      }

      // Save in batches
      if (saveBatch.length >= batchSize) {
        await propertyRepo.save(saveBatch);
        console.log(`... mapped and saved ${mappedCount} properties`);
        saveBatch = [];
      }
    }

    // Save remaining
    if (saveBatch.length > 0) {
      await propertyRepo.save(saveBatch);
      console.log(`... mapped and saved ${mappedCount} properties`);
    }

    console.log(`✅ Mapping finished! Successfully remapped photos for ${mappedCount} secondary properties.`);
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Mapping failed:', error);
    process.exit(1);
  }
}

remapPhotos();
