import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';
import { Property } from '../entities/Property';

async function testDevelopersEndpoint() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Отримуємо всіх developers
    const developers = await AppDataSource.getRepository(Developer).find({
      order: { name: 'ASC' },
    });

    console.log(`📊 Total developers: ${developers.length}\n`);

    // Отримуємо підрахунок properties по developers
    const developerIds = developers.map(d => d.id);
    
    let countsQuery: any[] = [];
    if (developerIds.length > 0) {
      countsQuery = await AppDataSource
        .getRepository(Property)
        .createQueryBuilder('property')
        .select('property.developerId', 'developerId')
        .addSelect('COUNT(property.id)', 'total')
        .addSelect(
          "SUM(CASE WHEN property.propertyType = 'off-plan' THEN 1 ELSE 0 END)",
          'offPlan'
        )
        .addSelect(
          "SUM(CASE WHEN property.propertyType = 'secondary' THEN 1 ELSE 0 END)",
          'secondary'
        )
        .where('property.developerId IN (:...developerIds)', { developerIds })
        .groupBy('property.developerId')
        .getRawMany();
    }

    console.log(`📈 Developers with properties: ${countsQuery.length}\n`);

    // Створюємо мапу для швидкого доступу
    const developerPropertyCounts = new Map<string, {
      total: number;
      offPlan: number;
      secondary: number;
    }>();

    // Ініціалізуємо всі developers з нульовими значеннями
    developers.forEach(developer => {
      developerPropertyCounts.set(developer.id, {
        total: 0,
        offPlan: 0,
        secondary: 0,
      });
    });

    // Заповнюємо мапу з результатів SQL запиту
    countsQuery.forEach((row: any) => {
      developerPropertyCounts.set(row.developerId, {
        total: parseInt(row.total, 10) || 0,
        offPlan: parseInt(row.offPlan, 10) || 0,
        secondary: parseInt(row.secondary, 10) || 0,
      });
    });

    // Показуємо топ-10 developers з найбільшою кількістю properties
    const developersWithCounts = developers.map(developer => {
      const counts = developerPropertyCounts.get(developer.id) || {
        total: 0,
        offPlan: 0,
        secondary: 0,
      };

      return {
        id: developer.id,
        name: developer.name,
        projectsCount: counts,
      };
    });

    const topDevelopers = developersWithCounts
      .filter(d => d.projectsCount.total > 0)
      .sort((a, b) => b.projectsCount.total - a.projectsCount.total)
      .slice(0, 10);

    console.log('🏆 Top 10 developers by project count:');
    topDevelopers.forEach((dev, index) => {
      console.log(
        `  ${index + 1}. ${dev.name}: ${dev.projectsCount.total} total ` +
        `(${dev.projectsCount.offPlan} off-plan, ${dev.projectsCount.secondary} secondary)`
      );
    });

    const developersWithoutProjects = developersWithCounts.filter(
      d => d.projectsCount.total === 0
    ).length;

    console.log(`\n📊 Summary:`);
    console.log(`  Total developers: ${developers.length}`);
    console.log(`  Developers with projects: ${topDevelopers.length}`);
    console.log(`  Developers without projects: ${developersWithoutProjects}`);

    await AppDataSource.destroy();
    console.log('\n✅ Test completed');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testDevelopersEndpoint();

