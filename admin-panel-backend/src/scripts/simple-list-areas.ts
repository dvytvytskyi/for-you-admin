import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import * as fs from 'fs';
import * as path from 'path';

async function simpleListAreas() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const areaRepository = AppDataSource.getRepository(Area);

    // Get all areas sorted by name
    const areas = await areaRepository.find({
      relations: ['city'],
      order: { nameEn: 'ASC' },
    });

    console.log(`📊 Found ${areas.length} areas in database\n`);

    // Simple list
    console.log('📋 All Areas:\n');
    console.log('='.repeat(80));
    
    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const cityName = area.city?.nameEn || 'Unknown';
      console.log(`${(i + 1).toString().padStart(4)}. ${area.nameEn.padEnd(50)} (${cityName})`);
    }

    console.log('='.repeat(80));
    console.log(`\n📊 Total: ${areas.length} areas\n`);

    // Save to simple text file
    const outputPath = path.resolve(process.cwd(), 'all-areas-simple-list.txt');
    let text = `All Areas from Database\n`;
    text += `Total: ${areas.length} areas\n\n`;

    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const cityName = area.city?.nameEn || 'Unknown';
      text += `${(i + 1).toString().padStart(4)}. ${area.nameEn} (${cityName})\n`;
    }

    fs.writeFileSync(outputPath, text, 'utf-8');
    console.log(`✅ List saved to: ${outputPath}`);

    // Also save as markdown
    const mdPath = path.resolve(process.cwd(), 'all-areas-simple-list.md');
    let markdown = `# All Areas from Database\n\n`;
    markdown += `**Total:** ${areas.length} areas\n\n`;
    markdown += `| # | Area Name | City |\n`;
    markdown += `|---|-----------|------|\n`;

    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const cityName = area.city?.nameEn || 'Unknown';
      markdown += `| ${i + 1} | ${area.nameEn} | ${cityName} |\n`;
    }

    fs.writeFileSync(mdPath, markdown, 'utf-8');
    console.log(`✅ Markdown saved to: ${mdPath}\n`);

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

simpleListAreas();

