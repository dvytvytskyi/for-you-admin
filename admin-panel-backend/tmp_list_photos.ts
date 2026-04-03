import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property, PropertyType } from './src/entities/Property';

async function listPhotos() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const offPlan = await repo.find({ where: { propertyType: PropertyType.OFF_PLAN }, select: ['photos'] });
    const counts: Record<string, number> = {};
    offPlan.forEach(p => {
      const photos = (p.photos as any).split(',').map((u: string) => u.trim());
      photos.forEach((u: string) => {
        counts[u] = (counts[u] || 0) + 1;
      });
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    console.log('Top 20 overall photos in Off-Plan:');
    sorted.slice(0, 20).forEach(([url, count]) => {
      console.log(`- ${url}: ${count} projects`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

listPhotos();
