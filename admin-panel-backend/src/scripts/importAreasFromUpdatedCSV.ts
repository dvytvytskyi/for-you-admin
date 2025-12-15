import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  id: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  cityId: string;
  cityNameEn: string;
  cityNameRu: string;
  cityNameAr: string;
  countryId: string;
  countryNameEn: string;
  countryCode: string;
  descriptionEnTitle: string;
  descriptionEnText: string;
  descriptionRuTitle: string;
  descriptionRuText: string;
  infrastructureEnTitle: string;
  infrastructureEnText: string;
  infrastructureRuTitle: string;
  infrastructureRuText: string;
  images: string;
}

async function importAreas() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const areaRepository = AppDataSource.getRepository(Area);

    // Step 1: Delete all existing areas
    console.log('\n🗑️  Deleting all existing areas...');
    const existingAreas = await areaRepository.find();
    const existingCount = existingAreas.length;
    
    if (existingCount > 0) {
      await areaRepository.remove(existingAreas);
      console.log(`✅ Deleted ${existingCount} existing areas`);
    } else {
      console.log('ℹ️  No existing areas to delete');
    }

    // Step 2: Find and read CSV file
    const possiblePaths = [
      path.resolve(__dirname, '../../../area_updated.csv'),
      path.resolve(process.cwd(), 'area_updated.csv'),
      '/app/area_updated.csv',
      path.resolve(__dirname, '../../area_updated.csv'),
    ];

    let csvPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        csvPath = possiblePath;
        break;
      }
    }

    if (!csvPath) {
      throw new Error(`CSV file not found. Tried: ${possiblePaths.join(', ')}`);
    }

    console.log(`\n📖 Reading CSV file: ${csvPath}...`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('🔄 Parsing CSV...');
    const records: CSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      escape: '"',
    });

    console.log(`📊 Found ${records.length} areas to import\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Parse description in new format with en/ru
        let description: any = undefined;
        if (row.descriptionEnTitle || row.descriptionEnText || row.descriptionRuTitle || row.descriptionRuText) {
          description = {
            en: {
              title: row.descriptionEnTitle || undefined,
              description: row.descriptionEnText || undefined,
            },
            ru: {
              title: row.descriptionRuTitle || undefined,
              description: row.descriptionRuText || undefined,
            },
          };
          // Remove empty language objects
          if (!description.en.title && !description.en.description) {
            delete description.en;
          }
          if (!description.ru.title && !description.ru.description) {
            delete description.ru;
          }
          // If both languages are empty, set to undefined
          if (Object.keys(description).length === 0) {
            description = undefined;
          }
        }

        // Parse infrastructure in new format with en/ru
        let infrastructure: any = undefined;
        if (row.infrastructureEnTitle || row.infrastructureEnText || row.infrastructureRuTitle || row.infrastructureRuText) {
          infrastructure = {
            en: {
              title: row.infrastructureEnTitle || undefined,
              description: row.infrastructureEnText || undefined,
            },
            ru: {
              title: row.infrastructureRuTitle || undefined,
              description: row.infrastructureRuText || undefined,
            },
          };
          // Remove empty language objects
          if (!infrastructure.en.title && !infrastructure.en.description) {
            delete infrastructure.en;
          }
          if (!infrastructure.ru.title && !infrastructure.ru.description) {
            delete infrastructure.ru;
          }
          // If both languages are empty, set to undefined
          if (Object.keys(infrastructure).length === 0) {
            infrastructure = undefined;
          }
        }

        // Parse images - split by ' | ' (space, pipe, space)
        let images: string[] | undefined = undefined;
        if (row.images && row.images.trim()) {
          const imageUrls = row.images
            .split(' | ')
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')))
            .slice(0, 8); // Maximum 8 images
          
          if (imageUrls.length > 0) {
            images = imageUrls;
          }
        }

        // Validate required fields
        if (!row.id || !row.nameEn || !row.cityId) {
          throw new Error(`Missing required fields: id=${!!row.id}, nameEn=${!!row.nameEn}, cityId=${!!row.cityId}`);
        }

        // Create new area
        const area = areaRepository.create({
          id: row.id.trim(),
          cityId: row.cityId.trim(),
          nameEn: row.nameEn.trim() || row.nameEn,
          nameRu: row.nameRu?.trim() || row.nameEn.trim() || '',
          nameAr: row.nameAr?.trim() || row.nameEn.trim() || '',
          description: description,
          infrastructure: infrastructure,
          images: images,
        });

        await areaRepository.save(area);
        successCount++;

        if (successCount % 20 === 0) {
          console.log(`✅ Processed ${successCount}/${records.length} areas...`);
        }
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Area ${i + 1} (${row.nameEn || 'unknown'}): ${error.message}`;
        errors.push(errorMsg);
        if (errorCount <= 10) {
          console.error(`❌ ${errorMsg}`);
        }
      }
    }

    console.log('\n📊 Import Statistics:');
    console.log(`   ✅ Successfully imported: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    
    if (errors.length > 0 && errors.length <= 20) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`   • ${err}`));
    } else if (errors.length > 20) {
      console.log(`\n❌ First 20 errors (total ${errors.length}):`);
      errors.slice(0, 20).forEach(err => console.log(`   • ${err}`));
    }

    // Statistics
    const allAreas = await areaRepository.find();
    const areasWithImages = allAreas.filter(a => a.images && a.images.length > 0).length;
    const areasWithDescription = allAreas.filter(a => a.description).length;
    const areasWithInfrastructure = allAreas.filter(a => a.infrastructure).length;

    console.log('\n📈 Final Statistics:');
    console.log(`   📸 Areas with images: ${areasWithImages}`);
    console.log(`   📝 Areas with description: ${areasWithDescription}`);
    console.log(`   🏗️  Areas with infrastructure: ${areasWithInfrastructure}`);

    console.log('\n✅ Import completed!');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Import failed:', error);
    await AppDataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

importAreas();
