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

    // Видаляємо всі поточні areas
    console.log('🗑️  Deleting all existing areas...');
    const deleteResult = await areaRepository.delete({});
    console.log(`✅ Deleted ${deleteResult.affected || 0} existing areas\n`);

    // Шукаємо CSV файл
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

    console.log(`📖 Reading CSV file: ${csvPath}...`);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('🔄 Parsing CSV...');
    const records: CSVRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    console.log(`📊 Found ${records.length} areas to import\n`);

    let successCount = 0;
    let errorCount = 0;
    let areasWithDescription = 0;
    let areasWithInfrastructure = 0;
    let areasWithImages = 0;
    let totalImages = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Парсимо description в новому форматі з мовами
        let description: any = undefined;
        const hasEnDesc = row.descriptionEnTitle || row.descriptionEnText;
        const hasRuDesc = row.descriptionRuTitle || row.descriptionRuText;
        
        if (hasEnDesc || hasRuDesc) {
          description = {};
          if (hasEnDesc) {
            description.en = {
              title: row.descriptionEnTitle || undefined,
              description: row.descriptionEnText || undefined,
            };
          }
          if (hasRuDesc) {
            description.ru = {
              title: row.descriptionRuTitle || undefined,
              description: row.descriptionRuText || undefined,
            };
          }
          areasWithDescription++;
        }

        // Парсимо infrastructure в новому форматі з мовами
        let infrastructure: any = undefined;
        const hasEnInfra = row.infrastructureEnTitle || row.infrastructureEnText;
        const hasRuInfra = row.infrastructureRuTitle || row.infrastructureRuText;
        
        if (hasEnInfra || hasRuInfra) {
          infrastructure = {};
          if (hasEnInfra) {
            infrastructure.en = {
              title: row.infrastructureEnTitle || undefined,
              description: row.infrastructureEnText || undefined,
            };
          }
          if (hasRuInfra) {
            infrastructure.ru = {
              title: row.infrastructureRuTitle || undefined,
              description: row.infrastructureRuText || undefined,
            };
          }
          areasWithInfrastructure++;
        }

        // Парсимо images - розділені через " | " (пробіл, вертикальна риска, пробіл)
        let images: string[] | undefined = undefined;
        if (row.images && row.images.trim()) {
          images = row.images
            .split(' | ')
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')))
            .slice(0, 8); // Максимум 8 фото
          
          if (images.length > 0) {
            areasWithImages++;
            totalImages += images.length;
          } else {
            images = undefined;
          }
        }

        // Створюємо area
        const area = areaRepository.create({
          id: row.id,
          cityId: row.cityId,
          nameEn: row.nameEn || '',
          nameRu: row.nameRu || row.nameEn || '',
          nameAr: row.nameAr || row.nameEn || '',
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
    console.log(`   📝 Areas with description: ${areasWithDescription}`);
    console.log(`   🏗️  Areas with infrastructure: ${areasWithInfrastructure}`);
    console.log(`   📸 Areas with images: ${areasWithImages}`);
    console.log(`   🖼️  Total images imported: ${totalImages}`);
    
    if (errors.length > 0 && errors.length <= 20) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`   • ${err}`));
    } else if (errors.length > 20) {
      console.log(`\n❌ First 20 errors (total ${errors.length}):`);
      errors.slice(0, 20).forEach(err => console.log(`   • ${err}`));
    }

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
