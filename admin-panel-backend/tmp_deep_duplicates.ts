import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property, PropertyType } from './src/entities/Property';

async function analyzeDuplicatesDeep() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const properties = await repo.find({ 
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'photos']
    });

    const photoCounts: Record<string, number> = {};
    const projectFingerprints: Record<string, string> = {};

    properties.forEach(p => {
      const photos = (p.photos as any).split(',').map((u: string) => u.trim()).filter((u: string) => !!u).sort();
      const fingerprint = photos.join('|');
      projectFingerprints[p.id] = fingerprint;
      
      photos.forEach((u: string) => {
        photoCounts[u] = (photoCounts[u] || 0) + 1;
      });
    });

    // Find sets of photos that are exactly the same across projects
    const fingerprintCounts: Record<string, string[]> = {};
    Object.entries(projectFingerprints).forEach(([id, fp]) => {
        if (!fp) return;
        if (!fingerprintCounts[fp]) {
            fingerprintCounts[fp] = [];
        }
        fingerprintCounts[fp].push(id);
    });

    const duplicateSets = Object.entries(fingerprintCounts).filter(([fp, ids]) => ids.length > 1);

    console.log(`--- DEEP DUPLICATES ANALYSIS ---`);
    console.log(`Total projects: ${properties.length}`);
    console.log(`Sets of projects with IDENTICAL photo galleries: ${duplicateSets.length}`);
    
    // List top 5 most repeated galleries
    const sortedSets = duplicateSets.sort((a,b) => b[1].length - a[1].length);
    for(let i=0; i<Math.min(5, sortedSets.length); i++){
        const [fp, ids] = sortedSets[i];
        const names = properties.filter(p => ids.includes(p.id)).map(p => p.name);
        console.log(`\nGallery repeated in: ${ids.length} projects`);
        console.log(`Projects: ${names.join(', ')}`);
        console.log(`First photo: ${fp.split('|')[0]}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

analyzeDuplicatesDeep();
