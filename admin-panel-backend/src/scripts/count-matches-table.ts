import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';

function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b(the|tower|towers|residence|residences|building|apartments|villa|villas|hotel|tower[\s]?a|tower[\s]?b|tower[\s]?c|tower[\s]?d|tower[\s]?1|tower[\s]?2|tower[\s]?3|tower[\s]?4|tower[\s]?5)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function countMatches() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    // 1. Отримуємо всі Off-Plan
    const offPlan = await repo.find({
        where: { propertyType: PropertyType.OFF_PLAN },
        select: ['id', 'name']
    });

    // 2. Отримуємо всі Secondary з buildingName
    const secondary = await repo.find({
        where: { propertyType: PropertyType.SECONDARY },
        select: ['id', 'buildingName']
    });

    console.log(`🔍 Total Secondary: ${secondary.length}`);
    console.log(`🔍 Total Off-Plan: ${offPlan.length}`);

    const matchCounts: Record<string, number> = {};
    const normalizedToOriginal: Record<string, string> = {};

    offPlan.forEach(p => {
        const norm = normalizeName(p.name);
        if (norm) {
            matchCounts[norm] = 0;
            normalizedToOriginal[norm] = p.name;
        }
    });

    let totalMatches = 0;
    secondary.forEach(s => {
        if (s.buildingName) {
            const norm = normalizeName(s.buildingName);
            if (matchCounts[norm] !== undefined) {
                matchCounts[norm]++;
                totalMatches++;
            }
        }
    });

    console.log(`✨ Total Matched Properties: ${totalMatches}`);

    // 3. Створюємо нову таблицю в MD файлі
    let mdContent = `# Результати першої спроби мапінгу (by buildingname)\n\n`;
    mdContent += `### 📢 Підсумок: Вдалося зметчити **${totalMatches}** об'єктів Secondary з **${secondary.length}**.\n\n`;
    mdContent += `| № | Назва Off-Plan проекту | Знайдено Secondary об'єктів |\n`;
    mdContent += `|---|---|---|\n`;

    const sortedProjects = offPlan.sort((a,b) => a.name.localeCompare(b.name));
    
    sortedProjects.forEach((p, index) => {
        const norm = normalizeName(p.name);
        const count = matchCounts[norm] || 0;
        const countLabel = count > 0 ? `**${count}**` : `0`;
        mdContent += `| ${index + 1} | ${p.name.trim()} | ${countLabel} |\n`;
    });

    fs.writeFileSync('/Users/vytvytskyi/admin_for_you/off_plan_projects.md', mdContent);
    console.log(`✅ Файл off_plan_projects.md оновлено.`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

countMatches();
