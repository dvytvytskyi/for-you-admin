import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';
import * as path from 'path';

async function exportUnmatched() {
  try {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    const propertyRepo = AppDataSource.getRepository(Property);

    console.log('📖 Searching for unmatched secondary properties...');
    const unmatched = await propertyRepo.createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.parent_project_id IS NULL')
      .select([
        'property.id',
        'property.name',
        'property.buildingName',
        'property.description',
        'area.nameEn'
      ])
      .getMany();

    const data = unmatched.map(p => ({
      id: p.id,
      name: p.name,
      buildingName: p.buildingName,
      area: p.area?.nameEn,
      descriptionSnippet: p.description ? p.description.substring(0, 100) + '...' : ''
    }));

    const outputPath = path.resolve(process.cwd(), '../unmatched_properties.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`✅ Exported ${data.length} properties to ${outputPath}`);

  } catch (error) {
    console.error('❌ Error during export:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

exportUnmatched();
