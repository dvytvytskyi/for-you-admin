import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';

async function updateMappingWithStats() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const offPlan = await repo.find({
        where: { propertyType: PropertyType.OFF_PLAN },
        select: ['id', 'name']
    });

    const secondary = await repo.find({
        where: { propertyType: PropertyType.SECONDARY },
        select: ['id', 'description', 'buildingName']
    });

    const projects = offPlan.map(p => ({
        id: p.id,
        name: p.name.trim(),
        lowerName: p.name.trim().toLowerCase()
    }));

    const betaMatchCounts: Record<string, number> = {};
    const exactMatchCounts: Record<string, number> = {};
    
    // Множини для підрахунку УНІКАЛЬНИХ об'єктів
    const uniqueExactIds = new Set<string>();
    const uniqueBetaIds = new Set<string>();
    const allMatchedIds = new Set<string>();

    projects.forEach(p => {
        betaMatchCounts[p.id] = 0;
        exactMatchCounts[p.id] = 0;
    });

    secondary.forEach(s => {
        const sBuilding = (s.buildingName || '').toLowerCase().trim();
        const sDesc = (s.description || '').toLowerCase();
        let matchedSomething = false;

        projects.forEach(p => {
            // Перевірка по Building Name
            if (sBuilding === p.lowerName) {
                exactMatchCounts[p.id]++;
                uniqueExactIds.add(s.id);
                allMatchedIds.add(s.id);
                matchedSomething = true;
            }
            // Перевірка по Опису
            if (sDesc.includes(p.lowerName)) {
                betaMatchCounts[p.id]++;
                uniqueBetaIds.add(s.id);
                allMatchedIds.add(s.id);
                matchedSomething = true;
            }
        });
    });

    // Підготовка MD контенту
    let mdContent = `# 🚀 Глобальний Аудит Мапінгу Фото\n\n`;
    
    mdContent += `## 📊 Загальна статистика\n`;
    mdContent += `| Показник | Значення |\n`;
    mdContent += `|---|---|\n`;
    mdContent += `| **Усього портфоліо Secondary** | ${secondary.length} об'єктів |\n`;
    mdContent += `| **Усього проектів Off-Plan** | ${offPlan.length} проектів |\n`;
    mdContent += `| **Точне охоплення (по назві будівлі)** | ${uniqueExactIds.size} об'єктів (${((uniqueExactIds.size/secondary.length)*100).toFixed(1)}%) |\n`;
    mdContent += `| **Бета охоплення (тільки за описом)** | ${uniqueBetaIds.size} об'єктів (${((uniqueBetaIds.size/secondary.length)*100).toFixed(1)}%) |\n`;
    mdContent += `| **СУМАРНЕ ОХОПЛЕННЯ** | **${allMatchedIds.size} об'єктів (${((allMatchedIds.size/secondary.length)*100).toFixed(1)}%)** |\n`;
    mdContent += `| **Ще не замаплено** | **${secondary.length - allMatchedIds.size} об'єктів** |\n\n`;

    mdContent += `### 🏷 Легенда таблиці:\n`;
    mdContent += `- **Знайдено (Building)**: Кількість за точною назвою будівлі.\n`;
    mdContent += `- <span style="color:red">**Бета (Description)**</span>: Кількість за повним збігом назви в описі.\n\n`;
    
    mdContent += `| № | Назва проекту | Знайдено (Building) | <span style="color:red">Бета (Description)</span> |\n`;
    mdContent += `|---|---|---:|---:|\n`;

    const sorted = projects.sort((a,b) => a.name.localeCompare(b.name));
    sorted.forEach((p, index) => {
        const buildCount = exactMatchCounts[p.id];
        const betaCount = betaMatchCounts[p.id];
        const buildLabel = buildCount > 0 ? `**${buildCount}**` : `0`;
        const betaLabel = betaCount > 0 ? `<span style="color:red">**${betaCount}**</span>` : `0`;
        mdContent += `| ${index + 1} | ${p.name} | ${buildLabel} | ${betaLabel} |\n`;
    });

    fs.writeFileSync('/Users/vytvytskyi/admin_for_you/off_plan_projects.md', mdContent);
    console.log(`✅ Статистику оновлено у файлі off_plan_projects.md`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

updateMappingWithStats();
