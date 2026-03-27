import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function deleteUnmatched() {
  try {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    const propertyRepo = AppDataSource.getRepository(Property);

    console.log('🔍 Calculating remaining unmatched properties...');
    const count = await propertyRepo.createQueryBuilder('property')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.parent_project_id IS NULL')
      .getCount();

    if (count === 0) {
      console.log('✅ No unmatched properties found to delete.');
      return;
    }

    console.log(`⚠️  WARNING: You are about to delete ${count} secondary properties.`);

    const result = await propertyRepo.createQueryBuilder()
      .delete()
      .from(Property)
      .where('propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('parent_project_id IS NULL')
      .execute();

    console.log(`✅ Successfully deleted ${result.affected} properties.`);

  } catch (error) {
    console.error('❌ Error during deletion:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

deleteUnmatched();
