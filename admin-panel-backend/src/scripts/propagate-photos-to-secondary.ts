import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function propagatePhotos() {
  try {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    const propertyRepo = AppDataSource.getRepository(Property);

    console.log('📖 Searching for secondary properties that need photos from projects...');
    
    // Знаходимо всі secondary, у яких є parentProjectId, але немає своїх фото
    const secondaryProperties = await propertyRepo.createQueryBuilder('property')
      .leftJoinAndSelect('property.parentProject', 'parentProject')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.parentProjectId IS NOT NULL')
      .andWhere('(property.photos IS NULL OR property.photos = \'[]\')')
      .getMany();

    console.log(`📡 Found ${secondaryProperties.length} properties to update.`);

    let updatedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < secondaryProperties.length; i += batchSize) {
      const batch = secondaryProperties.slice(i, i + batchSize);
      
      const updatePromises = batch.map(async (property) => {
        if (property.parentProject?.photos && property.parentProject.photos.length > 0) {
          property.photos = property.parentProject.photos;
          await propertyRepo.save(property);
          updatedCount++;
        }
      });

      await Promise.all(updatePromises);
      console.log(`⏳ Processed ${Math.min(i + batchSize, secondaryProperties.length)} / ${secondaryProperties.length}...`);
    }

    console.log(`✅ Finished! Updated ${updatedCount} properties with photos from their parent projects.`);

  } catch (error) {
    console.error('❌ Error during photo propagation:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

propagatePhotos();
