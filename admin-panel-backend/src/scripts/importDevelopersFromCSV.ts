import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface CSVRow {
  id: string;
  name: string;
  logo: string;
  description_en: string;
  description_ru: string;
  images: string;
  createdAt: string;
}

async function importDevelopers() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const developerRepository = AppDataSource.getRepository(Developer);

    const possiblePaths = [
      path.resolve(__dirname, '../../../developers-full-export.csv'),
      path.resolve(process.cwd(), 'developers-full-export.csv'),
      '/app/developers-full-export.csv',
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

    console.log(`📊 Found ${records.length} developers to import\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Parse images
        const images = row.images ? row.images.split(';').filter(img => img.trim()) : undefined;
        
        // Combine descriptions (prefer English, fallback to Russian)
        const description = row.description_en || row.description_ru || null;

        let developer = await developerRepository.findOne({ where: { id: row.id } });
        if (!developer) {
          developer = developerRepository.create({
            id: row.id,
            name: row.name,
            logo: row.logo || null,
            description: description,
            images: images,
          });
          developer = await developerRepository.save(developer);
          successCount++;
        } else {
          // Update existing
          developer.name = row.name;
          developer.logo = row.logo || null;
          developer.description = description;
          developer.images = images;
          await developerRepository.save(developer);
          successCount++;
        }

        if (successCount % 50 === 0) {
          console.log(`✅ Processed ${successCount}/${records.length} developers...`);
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`Developer ${i + 1} (${row.name}): ${error.message}`);
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

importDevelopers();
