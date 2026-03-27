import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function updateSecondaryPhotos() {
  try {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    const propertyRepo = AppDataSource.getRepository(Property);

    console.log('📖 Searching for secondary properties to update photos from linked projects...');
    
    // Знаходимо всі secondary, у яких є parentProjectId
    const secondaryProperties = await propertyRepo.createQueryBuilder('property')
      .leftJoinAndSelect('property.parentProject', 'parentProject')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.parentProjectId IS NOT NULL')
      .getMany();

    console.log(`📡 Found ${secondaryProperties.length} properties to link galleries.`);

    let updatedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < secondaryProperties.length; i += batchSize) {
      const batch = secondaryProperties.slice(i, i + batchSize);
      
      const updatePromises = batch.map(async (property) => {
        // Якщо у проекту є фото, і їх більше ніж у вторинки (або просто хочемо оновити)
        if (property.parentProject?.photos && property.parentProject.photos.length > 0) {
          // Якщо поточна фотографія одна, а в проекті багато — замінюємо або додаємо
          // У цьому випадку ми просто запишемо галерею проекту
          property.photos = property.parentProject.photos;
          await propertyRepo.save(property);
          updatedCount++;
        }
      });

      await Promise.all(updatePromises);
      console.log(`⏳ Updated ${Math.min(i + batchSize, secondaryProperties.length)} / ${secondaryProperties.length}...`);
    }

    console.log(`✅ Success! Updated galleries for ${updatedCount} secondary properties.`);

  } catch (error) {
    console.error('❌ Error during photo update:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

updateSecondaryPhotos();
