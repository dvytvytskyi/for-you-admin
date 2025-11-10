import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { Property, PropertyType } from '../entities/Property';

async function countOffPlanByArea() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const areaRepo = AppDataSource.getRepository(Area);
    const propertyRepo = AppDataSource.getRepository(Property);

    // Отримуємо всі areas
    const allAreas = await areaRepo.find({
      order: { nameEn: 'ASC' },
    });

    console.log(`📊 Всього areas: ${allAreas.length}\n`);
    console.log('🔍 Підрахунок off-plan properties по areas...\n');

    const results: Array<{
      areaId: string;
      areaName: string;
      projectsCount: number;
    }> = [];

    // Підраховуємо off-plan properties для кожного area
    for (const area of allAreas) {
      const count = await propertyRepo.count({
        where: {
          areaId: area.id,
          propertyType: PropertyType.OFF_PLAN,
        },
      });

      if (count > 0) {
        results.push({
          areaId: area.id,
          areaName: area.nameEn,
          projectsCount: count,
        });
      }
    }

    // Сортуємо за кількістю проектів (від більшого до меншого)
    results.sort((a, b) => b.projectsCount - a.projectsCount);

    // Формуємо markdown контент
    let markdown = '# Підрахунок off-plan проектів по areas\n\n';
    markdown += `**Загальна кількість areas з off-plan проектами:** ${results.length}\n\n`;
    markdown += `**Загальна кількість off-plan проектів:** ${results.reduce((sum, r) => sum + r.projectsCount, 0)}\n\n`;
    markdown += '---\n\n';
    markdown += '| Area ID | Area Name | Кількість проектів |\n';
    markdown += '|---------|-----------|---------------------|\n';

    for (const result of results) {
      markdown += `| \`${result.areaId}\` | ${result.areaName} | **${result.projectsCount}** |\n`;
    }

    markdown += '\n---\n\n';
    markdown += '## Топ-20 areas за кількістю off-plan проектів\n\n';

    const top20 = results.slice(0, 20);
    for (let i = 0; i < top20.length; i++) {
      const result = top20[i];
      markdown += `${i + 1}. **${result.areaName}** - ${result.projectsCount} проектів\n`;
    }

    // Зберігаємо у файл
    const fs = require('fs');
    const path = require('path');
    // Зберігаємо в корінь проекту
    const outputPath = path.join(__dirname, '../../../area-projects.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    console.log('📊 Результати:');
    console.log(`   Всього areas з off-plan проектами: ${results.length}`);
    console.log(`   Загальна кількість off-plan проектів: ${results.reduce((sum, r) => sum + r.projectsCount, 0)}`);
    console.log('\n📋 Топ-10 areas:');
    results.slice(0, 10).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.areaName}: ${r.projectsCount} проектів`);
    });

    console.log(`\n✅ Результати збережено у файл: ${outputPath}`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

countOffPlanByArea();

