import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  id: string;
  cityId: string;
  cityName: string;
  countryId: string;
  countryName: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  description_en_title: string;
  description_en_description: string;
  description_ru_title: string;
  description_ru_description: string;
  infrastructure_en_title: string;
  infrastructure_en_description: string;
  infrastructure_ru_title: string;
  infrastructure_ru_description: string;
  images: string;
}

async function importAreas() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const areaRepository = AppDataSource.getRepository(Area);

    const possiblePaths = [
      path.resolve(__dirname, '../../../areas-export.csv'),
      path.resolve(process.cwd(), 'areas-export.csv'),
      '/app/areas-export.csv',
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
    });

    console.log(`📊 Found ${records.length} areas to import\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Parse description
        const description = (row.description_en_title || row.description_en_description) ? {
          title: row.description_en_title || undefined,
          description: row.description_en_description || undefined,
        } : undefined;

        // Parse infrastructure
        const infrastructure = (row.infrastructure_en_title || row.infrastructure_en_description) ? {
          title: row.infrastructure_en_title || undefined,
          description: row.infrastructure_en_description || undefined,
        } : undefined;

        // Parse images
        const images = row.images ? row.images.split(';').filter(img => img.trim()).slice(0, 8) : undefined;

        let area = await areaRepository.findOne({ where: { id: row.id } });
        if (!area) {
          area = areaRepository.create({
            id: row.id,
            cityId: row.cityId,
            nameEn: row.nameEn,
            nameRu: row.nameRu,
            nameAr: row.nameAr,
            description: description,
            infrastructure: infrastructure,
            images: images,
          });
          area = await areaRepository.save(area);
          successCount++;
        } else {
          // Update existing
          area.cityId = row.cityId;
          area.nameEn = row.nameEn;
          area.nameRu = row.nameRu;
          area.nameAr = row.nameAr;
          area.description = description;
          area.infrastructure = infrastructure;
          area.images = images;
          await areaRepository.save(area);
          successCount++;
        }

        if (successCount % 100 === 0) {
          console.log(`✅ Processed ${successCount}/${records.length} areas...`);
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`Area ${i + 1} (${row.nameEn}): ${error.message}`);
        if (errorCount <= 10) {
          console.error(`❌ ${errors[errors.length - 1]}`);
        }
      }
    }

    console.log('\n📊 Import Statistics:');
    console.log(`   ✅ Successfully imported/updated: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    if (errors.length > 0 && errors.length <= 20) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`   • ${err}`));
    } else if (errors.length > 20) {
      console.log(`\n❌ First 20 errors (total ${errors.length}):`);
      errors.slice(0, 20).forEach(err => console.log(`   • ${err}`));
    }

    console.log('\n✅ Import completed!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importAreas();
