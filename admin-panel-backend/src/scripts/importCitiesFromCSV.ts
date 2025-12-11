import { AppDataSource } from '../config/database';
import { City } from '../entities/City';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  id: string;
  countryId: string;
  countryName: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
}

async function importCities() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const cityRepository = AppDataSource.getRepository(City);

    const possiblePaths = [
      path.resolve(__dirname, '../../../cities-export.csv'),
      path.resolve(process.cwd(), 'cities-export.csv'),
      '/app/cities-export.csv',
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

    console.log(`📊 Found ${records.length} cities to import\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        let city = await cityRepository.findOne({ where: { id: row.id } });
        if (!city) {
          city = cityRepository.create({
            id: row.id,
            countryId: row.countryId,
            nameEn: row.nameEn,
            nameRu: row.nameRu,
            nameAr: row.nameAr,
          });
          city = await cityRepository.save(city);
          successCount++;
        } else {
          // Update existing
          city.countryId = row.countryId;
          city.nameEn = row.nameEn;
          city.nameRu = row.nameRu;
          city.nameAr = row.nameAr;
          await cityRepository.save(city);
          successCount++;
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`City ${i + 1} (${row.nameEn}): ${error.message}`);
        console.error(`❌ ${errors[errors.length - 1]}`);
      }
    }

    console.log('\n📊 Import Statistics:');
    console.log(`   ✅ Successfully imported/updated: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`   • ${err}`));
    }

    console.log('\n✅ Import completed!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importCities();
