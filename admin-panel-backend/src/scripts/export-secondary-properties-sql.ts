import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { Facility } from '../entities/Facility';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Скрипт для експорту secondary properties у SQL файл для імпорту на продакшн
 */

async function exportSecondaryPropertiesToSQL() {
  try {
    console.log('📤 Експорт secondary properties у SQL файл...\n');

    await AppDataSource.initialize();
    console.log('✅ Підключено до бази даних\n');

    const propertyRepo = AppDataSource.getRepository(Property);

    // Отримати всі secondary properties з facilities
    const secondaryProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.SECONDARY },
      relations: ['country', 'city', 'area', 'facilities'],
      order: { createdAt: 'DESC' },
    });

    if (secondaryProperties.length === 0) {
      console.log('❌ В БД немає secondary properties!');
      await AppDataSource.destroy();
      return;
    }

    console.log(`📊 Знайдено ${secondaryProperties.length} secondary properties\n`);

    // Генерація SQL
    let sql = `-- Secondary Properties Export\n`;
    sql += `-- Generated: ${new Date().toISOString()}\n`;
    sql += `-- Total properties: ${secondaryProperties.length}\n\n`;

    sql += `-- Увага: Цей скрипт використовує ON CONFLICT для оновлення існуючих properties\n`;
    sql += `-- Якщо property з таким id вже існує, вона буде оновлена\n\n`;

    sql += `BEGIN;\n\n`;

    // Експорт properties
    secondaryProperties.forEach((property, index) => {
      if (index % 1000 === 0) {
        console.log(`   Обробка: ${index}/${secondaryProperties.length}...`);
      }

      const photosJson = JSON.stringify(property.photos || []).replace(/'/g, "''");
      const description = (property.description || '').replace(/'/g, "''");

      sql += `-- Property ${index + 1}: ${property.name?.substring(0, 50) || 'Untitled'}\n`;
      sql += `INSERT INTO properties (`;
      sql += `id, "propertyType", name, photos, "countryId", "cityId", "areaId", `;
      sql += `latitude, longitude, description, "developerId", `;
      sql += `price, bedrooms, bathrooms, size, `;
      sql += `"createdAt", "updatedAt"`;
      sql += `)\n`;
      sql += `VALUES (\n`;
      sql += `  '${property.id}'::uuid,\n`;
      sql += `  '${property.propertyType}',\n`;
      sql += `  '${(property.name || '').replace(/'/g, "''")}',\n`;
      sql += `  '${photosJson}'::jsonb,\n`;
      sql += `  '${property.countryId}'::uuid,\n`;
      sql += `  '${property.cityId}'::uuid,\n`;
      sql += `  ${property.areaId ? `'${property.areaId}'::uuid` : 'NULL'},\n`;
      sql += `  ${property.latitude || 'NULL'},\n`;
      sql += `  ${property.longitude || 'NULL'},\n`;
      sql += `  '${description}',\n`;
      sql += `  ${property.developerId ? `'${property.developerId}'::uuid` : 'NULL'},\n`;
      sql += `  ${property.price || 'NULL'},\n`;
      sql += `  ${property.bedrooms !== null && property.bedrooms !== undefined ? property.bedrooms : 'NULL'},\n`;
      sql += `  ${property.bathrooms !== null && property.bathrooms !== undefined ? property.bathrooms : 'NULL'},\n`;
      sql += `  ${property.size || 'NULL'},\n`;
      sql += `  '${property.createdAt.toISOString()}',\n`;
      sql += `  '${property.updatedAt.toISOString()}'\n`;
      sql += `)\n`;
      sql += `ON CONFLICT (id) DO UPDATE SET\n`;
      sql += `  "propertyType" = EXCLUDED."propertyType",\n`;
      sql += `  name = EXCLUDED.name,\n`;
      sql += `  photos = EXCLUDED.photos,\n`;
      sql += `  "countryId" = EXCLUDED."countryId",\n`;
      sql += `  "cityId" = EXCLUDED."cityId",\n`;
      sql += `  "areaId" = EXCLUDED."areaId",\n`;
      sql += `  latitude = EXCLUDED.latitude,\n`;
      sql += `  longitude = EXCLUDED.longitude,\n`;
      sql += `  description = EXCLUDED.description,\n`;
      sql += `  "developerId" = EXCLUDED."developerId",\n`;
      sql += `  price = EXCLUDED.price,\n`;
      sql += `  bedrooms = EXCLUDED.bedrooms,\n`;
      sql += `  bathrooms = EXCLUDED.bathrooms,\n`;
      sql += `  size = EXCLUDED.size,\n`;
      sql += `  "updatedAt" = EXCLUDED."updatedAt";\n\n`;
    });

    // Експорт facilities (many-to-many)
    sql += `-- Properties Facilities (many-to-many)\n`;
    sql += `-- Спочатку видаляємо всі існуючі зв'язки для secondary properties\n`;
    sql += `DELETE FROM properties_facilities_facilities WHERE "propertiesId" IN (\n`;
    sql += `  SELECT id FROM properties WHERE "propertyType" = 'secondary'\n`;
    sql += `);\n\n`;

    // Додаємо нові зв'язки (групуємо по property для швидкості)
    let totalFacilityLinksCount = 0;
    const batchSize = 1000; // Групуємо по 1000 properties
    for (let i = 0; i < secondaryProperties.length; i += batchSize) {
      const batch = secondaryProperties.slice(i, i + batchSize);
      sql += `-- Facilities batch ${Math.floor(i / batchSize) + 1} (properties ${i + 1}-${Math.min(i + batchSize, secondaryProperties.length)})\n`;
      
      const values: string[] = [];
      batch.forEach((property) => {
        if (property.facilities && property.facilities.length > 0) {
          property.facilities.forEach((facility) => {
            values.push(`('${property.id}'::uuid, '${facility.id}'::uuid)`);
            totalFacilityLinksCount++;
          });
        }
      });

      if (values.length > 0) {
        sql += `INSERT INTO properties_facilities_facilities ("propertiesId", "facilitiesId") VALUES\n`;
        sql += `  ${values.join(',\n  ')};\n\n`;
      }
    }

    sql += `COMMIT;\n`;

    // Збереження у файл
    const outputPath = path.join(__dirname, '../../secondary-properties-export.sql');
    fs.writeFileSync(outputPath, sql, 'utf8');

    console.log(`✅ SQL файл створено: ${outputPath}`);
    console.log(`   Розмір: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Properties: ${secondaryProperties.length}`);
    console.log(`   Facilities links: ${totalFacilityLinksCount}\n`);

    console.log('📋 Наступні кроки для імпорту на продакшн:');
    console.log('   1. Скопіюйте файл secondary-properties-export.sql на продакшн сервер');
    console.log('   2. Підключіться до продакшн БД:');
    console.log('      psql -h <host> -U <user> -d <database>');
    console.log('   3. Виконайте SQL файл:');
    console.log('      \\i secondary-properties-export.sql');
    console.log('   4. Або через командний рядок:');
    console.log('      psql -h <host> -U <user> -d <database> -f secondary-properties-export.sql\n');
    console.log('   ⚠️  УВАГА: Це оновить всі secondary properties на продакшн!');

  } catch (error: any) {
    console.error('❌ Помилка:', error);
    console.error(error.stack);
  } finally {
    await AppDataSource.destroy();
    console.log('✅ З\'єднання закрито');
  }
}

exportSecondaryPropertiesToSQL();

