import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { PropertyFinderProject } from '../entities/PropertyFinderProject';

async function count() {
  console.log('--- DB COUNT START ---');
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Connected');
    }
    
    // Count from properties table
    const propertyRepo = AppDataSource.getRepository(Property);
    const offPlanCount = await propertyRepo.count({
      where: { propertyType: PropertyType.OFF_PLAN }
    });
    console.log('Total Properties with type OFF_PLAN:', offPlanCount);

    // Count from property_finder_projects table
    const pfRepo = AppDataSource.getRepository(PropertyFinderProject);
    const pfCount = await pfRepo.count();
    console.log('Total Property Finder Projects:', pfCount);

    // Filter properties grouped by type for debugging
    const allTypes = await propertyRepo
      .createQueryBuilder('p')
      .select('p.propertyType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('p.propertyType')
      .getRawMany();
    
    console.log('All Property Types Counts:', allTypes);

  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    process.exit();
  }
}

count();
