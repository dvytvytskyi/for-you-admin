import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';

async function fixSpecificProperty() {
  try {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    const propertyRepo = AppDataSource.getRepository(Property);

    // Шукаємо за координатою
    const property = await propertyRepo.findOne({
      where: { longitude: 55.18431091 as any }, // використовуємо координату зі скріншота
      relations: ['parentProject']
    });

    if (!property) {
      console.log('❌ Property with longitude 55.18431091 not found.');
      return;
    }

    console.log(`🔎 Found property: ${property.name} (ID: ${property.id})`);
    console.log(`📊 Current property photos count: ${property.photos?.length || 0}`);
    console.log(`📂 Parent project ID: ${property.parentProjectId}`);

    if (property.parentProject) {
        console.log(`🖼️ Parent project photos count: ${property.parentProject.photos?.length || 0}`);
        
        // Оновлюємо галерею
        property.photos = property.parentProject.photos;
        await propertyRepo.save(property);
        
        console.log('✅ Photos updated successfully for this specific property.');
    } else {
        console.log('❌ This property has NO parent project linked!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

fixSpecificProperty();
