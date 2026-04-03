import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property, PropertyType } from './src/entities/Property';

function normalize(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b(the|tower|towers|residence|residences|building|apartments|villa|villas)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function simulate() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const offPlan = await repo.find({ where: { propertyType: PropertyType.OFF_PLAN }, select: ['name'] });
    const secondary = await repo.find({ where: { propertyType: PropertyType.SECONDARY }, select: ['name', 'buildingName'] });

    const opSet = new Set(offPlan.map(p => normalize(p.name)));
    
    let matchesBuilding = 0;
    let matchesName = 0;
    let totalUniqueMatches = 0;
    const matchedIds = new Set<string>();

    secondary.forEach(s => {
      const bNorm = normalize(s.buildingName || '');
      const nNorm = normalize(s.name);
      
      let matched = false;
      if (bNorm && opSet.has(bNorm)) {
        matchesBuilding++;
        matched = true;
      } else if (nNorm && opSet.has(nNorm)) {
        matchesName++;
        matched = true;
      }
      
      if (matched) {
        totalUniqueMatches++;
      }
    });

    console.log(`--- SIMULATION RESULTS ---`);
    console.log(`Total Secondary: ${secondary.length}`);
    console.log(`Matched by buildingName: ${matchesBuilding}`);
    console.log(`Matched by property name: ${matchesName}`);
    console.log(`Total Secondary properties that will get project photos: ${totalUniqueMatches}`);
    console.log(`Match rate: ${((totalUniqueMatches/secondary.length)*100).toFixed(2)}%`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

simulate();
