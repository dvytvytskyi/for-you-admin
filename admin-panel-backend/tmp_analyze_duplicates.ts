import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property, PropertyType } from './src/entities/Property';

async function analyzeDuplicates() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const properties = await repo.find({ 
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'photos']
    });

    const photoCounts: Record<string, { count: number, projects: string[] }> = {};
    
    properties.forEach(p => {
      const photos = (p.photos as any).split(',').map((u: string) => u.trim()).filter((u: string) => !!u);
      photos.forEach((u: string) => {
        if (!photoCounts[u]) {
          photoCounts[u] = { count: 0, projects: [] };
        }
        photoCounts[u].count++;
        if (photoCounts[u].projects.length < 5) {
          photoCounts[u].projects.push(p.name);
        }
      });
    });

    const duplicates = Object.entries(photoCounts)
      .filter(([url, data]) => data.count > 10 && !url.includes('amenity'))
      .sort((a, b) => b[1].count - a[1].count);

    console.log(`--- PHOTO DUPLICATES ANALYSIS ---`);
    console.log(`Found ${duplicates.length} base photos that repeat in more than 10 projects.`);
    
    duplicates.slice(0, 15).forEach(([url, data]) => {
      console.log(`\nURL: ${url}`);
      console.log(`Repeats in: ${data.count} projects`);
      console.log(`Example projects: ${data.projects.join(', ')}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

analyzeDuplicates();
