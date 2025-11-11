import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { Area } from '../entities/Area';
import * as fs from 'fs';
import * as path from 'path';

interface AreaStats {
  areaName: string;
  areaId: string;
  cityName: string;
  projectCount: number;
}

async function countOffPlanByArea() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const propertyRepository = AppDataSource.getRepository(Property);
    const areaRepository = AppDataSource.getRepository(Area);

    // Get all off-plan properties with area relation
    const offPlanProperties = await propertyRepository.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      relations: ['area', 'city'],
    });

    console.log(`📊 Found ${offPlanProperties.length} off-plan properties\n`);

    // Group by area
    const areaMap = new Map<string, AreaStats>();

    for (const property of offPlanProperties) {
      if (!property.area) {
        continue; // Skip properties without area
      }

      const areaKey = property.area.id;
      const areaName = property.area.nameEn || 'Unknown';
      const cityName = property.city?.nameEn || 'Unknown';

      if (!areaMap.has(areaKey)) {
        areaMap.set(areaKey, {
          areaName,
          areaId: areaKey,
          cityName,
          projectCount: 0,
        });
      }

      const stats = areaMap.get(areaKey)!;
      stats.projectCount++;
    }

    // Convert to array and sort by project count (descending)
    const areaStats: AreaStats[] = Array.from(areaMap.values())
      .sort((a, b) => b.projectCount - a.projectCount);

    console.log('📋 Areas with off-plan projects:\n');
    console.log('='.repeat(80));
    console.log(`${'Area Name'.padEnd(40)} ${'City'.padEnd(20)} ${'Projects'.padStart(10)}`);
    console.log('='.repeat(80));

    let totalProjects = 0;
    for (const stats of areaStats) {
      console.log(
        `${stats.areaName.padEnd(40)} ${stats.cityName.padEnd(20)} ${stats.projectCount.toString().padStart(10)}`
      );
      totalProjects += stats.projectCount;
    }

    console.log('='.repeat(80));
    console.log(`${'TOTAL'.padEnd(40)} ${''.padEnd(20)} ${totalProjects.toString().padStart(10)}`);
    console.log('='.repeat(80));
    console.log(`\n📊 Total areas: ${areaStats.length}`);
    console.log(`📊 Total projects: ${totalProjects}\n`);

    // Save to markdown file
    const outputPath = path.resolve(process.cwd(), 'offplan-areas-stats.md');
    let markdown = '# Off-Plan Projects by Area\n\n';
    markdown += `**Total Areas:** ${areaStats.length}\n`;
    markdown += `**Total Projects:** ${totalProjects}\n\n`;
    markdown += '| Area Name | City | Projects |\n';
    markdown += '|-----------|------|----------|\n';

    for (const stats of areaStats) {
      markdown += `| ${stats.areaName} | ${stats.cityName} | ${stats.projectCount} |\n`;
    }

    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`✅ Statistics saved to: ${outputPath}`);

    // Also save as JSON
    const jsonPath = path.resolve(process.cwd(), 'offplan-areas-stats.json');
    fs.writeFileSync(jsonPath, JSON.stringify(areaStats, null, 2), 'utf-8');
    console.log(`✅ JSON data saved to: ${jsonPath}\n`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error counting off-plan by area:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

countOffPlanByArea();
