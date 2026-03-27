import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';

async function matchSecondaryToProjects() {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
    } catch (e: any) {
      console.log('Already initialized or error:', e.message);
    }
  }
  const repo = AppDataSource.getRepository(Property);

  console.log('--- 1. Gathering project names dictionary ---');
  // 1. Get all projects (off-plan) with names
  const projects = await repo.find({
    where: { propertyType: 'off-plan' as any },
    select: ['id', 'name']
  });

  const sortedProjectNames = projects
    .map(p => p.name)
    .filter(name => name && name.length > 5) // Skip too short names like 'The'
    .sort((a, b) => b.length - a.length);

  const uniqueProjectNames = Array.from(new Set(sortedProjectNames));
  console.log(`Ready to match against ${uniqueProjectNames.length} project names.`);

  console.log('--- 2. Processing secondary properties in batches ---');
  const batchSize = 500;
  let offset = 0;
  let totalMatched = 0;
  let processed = 0;

  while (true) {
    const secondaryList = await repo.find({
      where: { propertyType: 'secondary' as any },
      take: batchSize,
      skip: offset,
      order: { id: 'ASC' }
    });

    if (secondaryList.length === 0) break;

    console.log(`Batch starting at ${offset}...`);

    for (const prop of secondaryList) {
      processed++;
      if (!prop.description) continue;
      
      const combinedText = (prop.name + ' ' + prop.description).toLowerCase();
      
      let matchedProject = null;
      for (const projectName of uniqueProjectNames) {
        if (combinedText.includes(projectName.toLowerCase())) {
          matchedProject = projectName;
          break; // Longest match first
        }
      }

      if (matchedProject && prop.name !== matchedProject) {
        prop.name = matchedProject;
        prop.nameEn = matchedProject;
        await repo.save(prop);
        totalMatched++;
      }
    }

    offset += batchSize;
    process.stdout.write(`\rProgress: ${processed} properties checked. Matched: ${totalMatched}`);
  }

  console.log(`\n\n✅ DONE! Total secondary matched and renamed: ${totalMatched}`);
  process.exit(0);
}

matchSecondaryToProjects().catch(console.error);
