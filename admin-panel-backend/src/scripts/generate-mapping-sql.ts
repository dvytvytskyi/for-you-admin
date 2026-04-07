import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';

async function generateMappingSql() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    // 1. Отримуємо проекти та об'єкти
    const offPlan = await repo.find({
        where: { propertyType: PropertyType.OFF_PLAN },
        select: ['id', 'name', 'photos', 'latitude', 'longitude']
    });

    const secondary = await repo.find({
        where: { propertyType: PropertyType.SECONDARY },
        select: ['id', 'description', 'buildingName', 'name']
    });

    const projects = offPlan.map(p => ({
        id: p.id,
        name: p.name.trim(),
        lowerName: p.name.trim().toLowerCase(),
        photos: p.photos || ''
    })).filter(p => p.photos);

    let sql = `-- Очищаємо логотипи перед мапінгом\nUPDATE properties SET photos = '' WHERE "propertyType" = 'secondary';\n\n`;
    let count = 0;

    secondary.forEach(s => {
        const sBuilding = (s.buildingName || '').toLowerCase().trim();
        const sDesc = (s.description || '').toLowerCase();
        
        // Знаходимо збіг (Пріоритет: Назва > Опис)
        let found = projects.find(p => sBuilding === p.lowerName);
        if (!found) {
            found = projects.find(p => sDesc.includes(p.lowerName));
        }

        if (found) {
            // Для SQL файлу ми екрануємо одинарні лапки в посиланнях фото
            const safePhotos = String(found.photos).replace(/'/g, "''");
            sql += `UPDATE properties SET photos = '${safePhotos}' WHERE id = '${s.id}';\n`;
            count++;
        }
    });

    fs.writeFileSync('/Users/vytvytskyi/admin_for_you/mapping_updates.sql', sql);
    console.log(`✅ Файл mapping_updates.sql згенеровано. Знайдено збігів: ${count}.`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

generateMappingSql();
