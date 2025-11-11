import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { City } from '../entities/City';
import * as fs from 'fs';
import * as path from 'path';

interface AreaInfo {
  areaName: string;
  areaId: string;
  cityName: string;
  cityId: string;
  countryName?: string;
  hasImages: boolean;
  imageCount: number;
}

async function listAllAreas() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const areaRepository = AppDataSource.getRepository(Area);
    const cityRepository = AppDataSource.getRepository(City);

    // Get all areas with city relation
    const areas = await areaRepository.find({
      relations: ['city', 'city.country'],
      order: { nameEn: 'ASC' },
    });

    console.log(`📊 Found ${areas.length} areas in total\n`);

    const areaList: AreaInfo[] = [];

    for (const area of areas) {
      const cityName = area.city?.nameEn || 'Unknown';
      const countryName = area.city?.country?.nameEn || 'Unknown';
      const hasImages = !!(area.images && area.images.length > 0);
      const imageCount = area.images ? area.images.length : 0;

      areaList.push({
        areaName: area.nameEn,
        areaId: area.id,
        cityName,
        cityId: area.cityId,
        countryName,
        hasImages,
        imageCount,
      });
    }

    // Group by city
    const areasByCity = new Map<string, AreaInfo[]>();
    for (const area of areaList) {
      if (!areasByCity.has(area.cityName)) {
        areasByCity.set(area.cityName, []);
      }
      areasByCity.get(area.cityName)!.push(area);
    }

    console.log('📋 All Areas:\n');
    console.log('='.repeat(100));
    console.log(`${'Area Name'.padEnd(50)} ${'City'.padEnd(25)} ${'Country'.padEnd(20)} ${'Images'.padStart(8)}`);
    console.log('='.repeat(100));

    let totalAreas = 0;
    let totalWithImages = 0;
    let totalImages = 0;

    // Sort cities alphabetically
    const sortedCities = Array.from(areasByCity.keys()).sort();

    for (const cityName of sortedCities) {
      const cityAreas = areasByCity.get(cityName)!;
      console.log(`\n📍 ${cityName} (${cityAreas.length} areas):`);
      
      for (const area of cityAreas.sort((a, b) => a.areaName.localeCompare(b.areaName))) {
        const imageInfo = area.hasImages ? `${area.imageCount} photos` : 'No photos';
        console.log(
          `  ${area.areaName.padEnd(48)} ${area.cityName.padEnd(23)} ${(area.countryName || '').padEnd(18)} ${imageInfo.padStart(8)}`
        );
        totalAreas++;
        if (area.hasImages) {
          totalWithImages++;
          totalImages += area.imageCount;
        }
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log(`TOTAL AREAS: ${totalAreas}`);
    console.log(`Areas with images: ${totalWithImages}`);
    console.log(`Total images: ${totalImages}`);
    console.log('='.repeat(100) + '\n');

    // Save to markdown file
    const outputPath = path.resolve(process.cwd(), 'all-areas-list.md');
    let markdown = '# All Areas List\n\n';
    markdown += `**Total Areas:** ${totalAreas}\n`;
    markdown += `**Areas with images:** ${totalWithImages}\n`;
    markdown += `**Total images:** ${totalImages}\n\n`;

    for (const cityName of sortedCities) {
      const cityAreas = areasByCity.get(cityName)!;
      markdown += `## ${cityName} (${cityAreas.length} areas)\n\n`;
      markdown += '| Area Name | Images |\n';
      markdown += '|-----------|--------|\n';
      
      for (const area of cityAreas.sort((a, b) => a.areaName.localeCompare(b.areaName))) {
        const imageInfo = area.hasImages ? `${area.imageCount} photos` : 'No photos';
        markdown += `| ${area.areaName} | ${imageInfo} |\n`;
      }
      markdown += '\n';
    }

    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`✅ List saved to: ${outputPath}`);

    // Also save as JSON
    const jsonPath = path.resolve(process.cwd(), 'all-areas-list.json');
    fs.writeFileSync(jsonPath, JSON.stringify(areaList, null, 2), 'utf-8');
    console.log(`✅ JSON data saved to: ${jsonPath}\n`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error listing areas:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

listAllAreas();

