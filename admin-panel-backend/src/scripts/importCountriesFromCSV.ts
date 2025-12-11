import { AppDataSource } from '../config/database';
import { Country } from '../entities/Country';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  id: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  code: string;
}

async function importCountries() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const countryRepository = AppDataSource.getRepository(Country);

    const possiblePaths = [
      path.resolve(__dirname, '../../../countries-export.csv'),
      path.resolve(process.cwd(), 'countries-export.csv'),
      '/app/countries-export.csv',
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

    console.log(`📊 Found ${records.length} countries to import\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        let country = await countryRepository.findOne({ where: { id: row.id } });
        if (!country) {
          country = countryRepository.create({
            id: row.id,
            nameEn: row.nameEn,
            nameRu: row.nameRu,
            nameAr: row.nameAr,
            code: row.code,
          });
          country = await countryRepository.save(country);
          successCount++;
        } else {
          // Update existing
          country.nameEn = row.nameEn;
          country.nameRu = row.nameRu;
          country.nameAr = row.nameAr;
          country.code = row.code;
          await countryRepository.save(country);
          successCount++;
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`Country ${i + 1} (${row.nameEn}): ${error.message}`);
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

importCountries();
