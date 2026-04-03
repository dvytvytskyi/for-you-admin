import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property, PropertyType } from './src/entities/Property';

async function listOffPlan() {
  try {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);
    const projects = await repo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['name', 'photos']
    });
    console.log(`Found ${projects.length} Off-Plan projects.`);
    projects.slice(0, 20).forEach(p => {
      console.log(`- ${p.name} (${p.photos?.length || 0} photos)`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

listOffPlan();
