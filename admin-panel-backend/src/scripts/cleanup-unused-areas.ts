import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';
import * as path from 'path';

interface AreaMapping {
  jsonArea: string;
  dbArea: string | null;
  dbAreaId: string | null;
  cityName: string | null;
  matched: boolean;
  matchType: string;
}

interface AreaStats {
  area: Area;
  isMapped: boolean;
  hasProperties: boolean;
  offPlanCount: number;
  secondaryCount: number;
  totalCount: number;
  shouldKeep: boolean;
  reason: string;
}

async function cleanupUnusedAreas() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Read mapping file (try multiple paths)
    const possiblePaths = [
      path.resolve(process.cwd(), 'areas-mapping.json'),
      path.resolve(__dirname, '../../../areas-mapping.json'),
      path.join(process.cwd(), 'areas-mapping.json'),
    ];

    let mappingPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        mappingPath = p;
        break;
      }
    }

    if (!mappingPath) {
      throw new Error(`Mapping file not found: areas-mapping.json (tried: ${possiblePaths.join(', ')})`);
    }

    const mappingData: AreaMapping[] = JSON.parse(
      fs.readFileSync(mappingPath, 'utf-8')
    );

    // Get all mapped area IDs
    const mappedAreaIds = new Set(
      mappingData
        .filter((m) => m.matched && m.dbAreaId)
        .map((m) => m.dbAreaId!)
    );

    console.log(`📖 Found ${mappedAreaIds.size} mapped areas in JSON\n`);

    // Get all areas from database
    const areaRepository = AppDataSource.getRepository(Area);
    const propertyRepository = AppDataSource.getRepository(Property);

    const allAreas = await areaRepository.find({
      relations: ['city'],
      order: { nameEn: 'ASC' },
    });

    console.log(`📊 Found ${allAreas.length} areas in database\n`);

    // Get property counts for each area
    console.log('🔍 Analyzing areas...\n');

    const areaStats: AreaStats[] = [];

    for (const area of allAreas) {
      // Check if area has properties
      const [offPlanCount, secondaryCount] = await Promise.all([
        propertyRepository.count({
          where: { areaId: area.id, propertyType: PropertyType.OFF_PLAN },
        }),
        propertyRepository.count({
          where: { areaId: area.id, propertyType: PropertyType.SECONDARY },
        }),
      ]);

      const totalCount = offPlanCount + secondaryCount;
      const isMapped = mappedAreaIds.has(area.id);
      const hasProperties = totalCount > 0;

      // Determine if area should be kept
      let shouldKeep = false;
      let reason = '';

      if (isMapped && hasProperties) {
        shouldKeep = true;
        reason = 'Mapped + Has Properties';
      } else if (isMapped && !hasProperties) {
        shouldKeep = true;
        reason = 'Mapped (no properties yet)';
      } else if (!isMapped && hasProperties) {
        shouldKeep = true;
        reason = 'Has Properties (not mapped)';
      } else {
        shouldKeep = false;
        reason = 'Not mapped + No properties';
      }

      areaStats.push({
        area,
        isMapped,
        hasProperties,
        offPlanCount,
        secondaryCount,
        totalCount,
        shouldKeep,
        reason,
      });
    }

    // Separate areas to keep and delete
    const areasToKeep = areaStats.filter((s) => s.shouldKeep);
    const areasToDelete = areaStats.filter((s) => !s.shouldKeep);

    // Display statistics
    console.log('📊 Analysis Results:\n');
    console.log('='.repeat(100));
    console.log(`Total areas in DB: ${allAreas.length}`);
    console.log(`Mapped areas: ${mappedAreaIds.size}`);
    console.log(`Areas to keep: ${areasToKeep.length}`);
    console.log(`Areas to delete: ${areasToDelete.length}`);
    console.log('='.repeat(100) + '\n');

    // Show breakdown by reason
    console.log('📋 Breakdown by reason:\n');
    const reasonGroups = areaStats.reduce((acc, stat) => {
      if (!acc[stat.reason]) {
        acc[stat.reason] = [];
      }
      acc[stat.reason].push(stat);
      return acc;
    }, {} as Record<string, AreaStats[]>);

    for (const [reason, stats] of Object.entries(reasonGroups)) {
      console.log(`  ${reason}: ${stats.length} areas`);
    }
    console.log('');

    // Show areas to delete
    if (areasToDelete.length > 0) {
      console.log('🗑️  Areas to be deleted:\n');
      console.log('='.repeat(100));
      console.log(
        `${'Area Name'.padEnd(50)} ${'City'.padEnd(20)} ${'Properties'.padStart(10)}`
      );
      console.log('='.repeat(100));

      for (const stat of areasToDelete) {
        const cityName = stat.area.city?.nameEn || 'N/A';
        console.log(
          `${stat.area.nameEn.padEnd(50)} ${cityName.padEnd(20)} ${stat.totalCount.toString().padStart(10)}`
        );
      }
      console.log('='.repeat(100) + '\n');

      // Ask for confirmation
      console.log('⚠️  WARNING: This will permanently delete the areas listed above.');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Delete areas
      console.log('🗑️  Deleting unused areas...\n');

      let deletedCount = 0;
      for (const stat of areasToDelete) {
        try {
          await areaRepository.remove(stat.area);
          deletedCount++;
          console.log(`  ✅ Deleted: ${stat.area.nameEn}`);
        } catch (error: any) {
          console.error(`  ❌ Error deleting ${stat.area.nameEn}:`, error.message);
        }
      }

      console.log(`\n✅ Successfully deleted ${deletedCount} areas`);
    } else {
      console.log('✅ No areas to delete. All areas are either mapped or have properties.\n');
    }

    // Show final statistics
    const remainingAreas = await areaRepository.count();
    console.log('📊 Final Statistics:\n');
    console.log('='.repeat(100));
    console.log(`Remaining areas in DB: ${remainingAreas}`);
    console.log(`Areas with off-plan properties: ${areaStats.filter((s) => s.offPlanCount > 0).length}`);
    console.log(`Areas with secondary properties: ${areaStats.filter((s) => s.secondaryCount > 0).length}`);
    console.log(`Areas with any properties: ${areaStats.filter((s) => s.totalCount > 0).length}`);
    console.log('='.repeat(100) + '\n');

    // Save report
    const reportPath = path.resolve(process.cwd(), 'areas-cleanup-report.md');
    let report = '# Areas Cleanup Report\n\n';
    report += `**Date:** ${new Date().toISOString()}\n\n`;
    report += `**Total areas in DB:** ${allAreas.length}\n`;
    report += `**Mapped areas:** ${mappedAreaIds.size}\n`;
    report += `**Areas kept:** ${areasToKeep.length}\n`;
    report += `**Areas deleted:** ${areasToDelete.length}\n\n`;

    report += '## Areas Kept\n\n';
    report += '| Area Name | City | Mapped | Off-Plan | Secondary | Total | Reason |\n';
    report += '|-----------|------|--------|----------|-----------|-------|--------|\n';

    for (const stat of areasToKeep.sort((a, b) => b.totalCount - a.totalCount)) {
      const cityName = stat.area.city?.nameEn || 'N/A';
      report += `| ${stat.area.nameEn} | ${cityName} | ${stat.isMapped ? '✅' : '❌'} | ${stat.offPlanCount} | ${stat.secondaryCount} | ${stat.totalCount} | ${stat.reason} |\n`;
    }

    if (areasToDelete.length > 0) {
      report += '\n## Areas Deleted\n\n';
      report += '| Area Name | City | Properties |\n';
      report += '|-----------|------|------------|\n';

      for (const stat of areasToDelete) {
        const cityName = stat.area.city?.nameEn || 'N/A';
        report += `| ${stat.area.nameEn} | ${cityName} | ${stat.totalCount} |\n`;
      }
    }

    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`✅ Report saved to: ${reportPath}\n`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error cleaning up areas:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

cleanupUnusedAreas();

