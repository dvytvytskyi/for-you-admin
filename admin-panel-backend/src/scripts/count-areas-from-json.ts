import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

interface AreaCount {
  areaName: string;
  projectCount: number;
}

async function countAreasFromJson() {
  try {
    console.log('📖 Reading all_properties.json...');

    // Find all_properties.json file
    const possiblePaths = [
      path.resolve(__dirname, '../../../all_properties.json'),
      path.resolve(process.cwd(), 'all_properties.json'),
      path.join(process.cwd(), 'all_properties.json'),
    ];

    let jsonPath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        jsonPath = p;
        break;
      }
    }

    if (!jsonPath) {
      throw new Error('all_properties.json not found in any of the expected locations');
    }

    console.log(`✅ Found file: ${jsonPath}\n`);

    // Read and parse JSON
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!data.properties || !Array.isArray(data.properties)) {
      throw new Error('Invalid JSON structure: expected { properties: [...] }');
    }

    console.log(`📊 Found ${data.properties.length} properties in JSON\n`);

    // Count areas
    const areaMap = new Map<string, number>();

    for (let i = 0; i < data.properties.length; i++) {
      const property = data.properties[i];
      
      // Try to get area from different possible locations
      let areaName: string | null = null;

      // Try 1: details.area
      if (property.details?.area) {
        areaName = String(property.details.area).trim();
      }
      // Try 2: basic_info.area
      else if (property.basic_info?.area) {
        areaName = String(property.basic_info.area).trim();
      }
      // Try 3: area (direct)
      else if (property.area) {
        areaName = String(property.area).trim();
      }

      if (areaName && areaName.length > 0) {
        // Normalize area name (trim, remove extra spaces)
        const normalizedArea = areaName.replace(/\s+/g, ' ').trim();
        
        if (!areaMap.has(normalizedArea)) {
          areaMap.set(normalizedArea, 0);
        }
        areaMap.set(normalizedArea, areaMap.get(normalizedArea)! + 1);
      } else {
        // Count properties without area
        if (!areaMap.has('(No Area)')) {
          areaMap.set('(No Area)', 0);
        }
        areaMap.set('(No Area)', areaMap.get('(No Area)')! + 1);
      }
    }

    // Convert to array and sort by count (descending)
    const areaStats: AreaCount[] = Array.from(areaMap.entries())
      .map(([areaName, projectCount]) => ({ areaName, projectCount }))
      .sort((a, b) => b.projectCount - a.projectCount);

    console.log('📋 Areas with project counts:\n');
    console.log('='.repeat(80));
    console.log(`${'Area Name'.padEnd(60)} ${'Projects'.padStart(10)}`);
    console.log('='.repeat(80));

    let totalProjects = 0;
    for (const stats of areaStats) {
      console.log(
        `${stats.areaName.padEnd(60)} ${stats.projectCount.toString().padStart(10)}`
      );
      totalProjects += stats.projectCount;
    }

    console.log('='.repeat(80));
    console.log(`${'TOTAL'.padEnd(60)} ${totalProjects.toString().padStart(10)}`);
    console.log('='.repeat(80));
    console.log(`\n📊 Total unique areas: ${areaStats.length}`);
    console.log(`📊 Total projects: ${totalProjects}\n`);

    // Save to markdown file
    const outputPath = path.resolve(process.cwd(), 'areas-from-json-stats.md');
    let markdown = '# Areas from all_properties.json\n\n';
    markdown += `**Total Unique Areas:** ${areaStats.length}\n`;
    markdown += `**Total Projects:** ${totalProjects}\n\n`;
    markdown += '| Area Name | Projects |\n';
    markdown += '|-----------|----------|\n';

    for (const stats of areaStats) {
      markdown += `| ${stats.areaName} | ${stats.projectCount} |\n`;
    }

    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`✅ Statistics saved to: ${outputPath}`);

    // Also save as JSON
    const jsonOutputPath = path.resolve(process.cwd(), 'areas-from-json-stats.json');
    fs.writeFileSync(jsonOutputPath, JSON.stringify(areaStats, null, 2), 'utf-8');
    console.log(`✅ JSON data saved to: ${jsonOutputPath}\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error counting areas from JSON:', error);
    process.exit(1);
  }
}

countAreasFromJson();

