import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';

async function betaMapping() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    // 1. Отримуємо всі Off-Plan проекти (наші ключі пошуку)
    const offPlan = await repo.find({
        where: { propertyType: PropertyType.OFF_PLAN },
        select: ['id', 'name']
    });

    // 2. Отримуємо всі Secondary об'єкти (тепер шукаємо тільки в ОПИСІ)
    const secondary = await repo.find({
        where: { propertyType: PropertyType.SECONDARY },
        select: ['id', 'description', 'buildingName']
    });

    console.log(`🔍 Total Secondary: ${secondary.length}`);
    console.log(`🔍 Total Off-Plan: ${offPlan.length}`);

    const betaMatchCounts: Record<string, number> = {};
    const exactMatchCounts: Record<string, number> = {}; // Ті, що ми вже знайшли раніше (по buildingName)

    // Підготовка Off-Plan (нормалізовані назви для порівняння)
    const projects = offPlan.map(p => ({
        id: p.id,
        name: p.name.trim(),
        lowerName: p.name.trim().toLowerCase()
    }));

    console.log('🔄 Сканування описів на повні збіги назв проектів...');

    // Рахуємо бета-збіги (в описі)
    projects.forEach(p => {
        betaMatchCounts[p.id] = 0;
        exactMatchCounts[p.id] = 0;
    });

    // Попередній розрахунок для buildingName (старий мапінг для таблиці)
    secondary.forEach(s => {
        const sBuilding = (s.buildingName || '').toLowerCase().trim();
        projects.forEach(p => {
            if (sBuilding === p.lowerName) {
                exactMatchCounts[p.id]++;
            }
            const sDesc = (s.description || '').toLowerCase();
            if (sDesc.includes(p.lowerName)) {
                betaMatchCounts[p.id]++;
            }
        });
    });

    let totalBeta = 0;
    Object.values(betaMatchCounts).forEach(c => totalBeta += c);
    console.log(`✨ Всього збігів у бета-мапінгу: ${totalBeta}`);

    // 3. Оновлюємо таблицю
    let mdContent = `# Реєстр проектів та мапінг (Бета-версія)\n\n`;
    mdContent += `🚦 **Статус**: Бета-сканування за повним описом назви проекту. \n\n`;
    mdContent += `### 🏷 Легенда:\n`;
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
    console.log(`✅ Файл off_plan_projects.md оновлено з бета-мапінгом.`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

betaMapping();
