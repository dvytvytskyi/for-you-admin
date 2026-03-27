import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function linkSecondaryToProjects() {
  try {
    console.log('🔄 Підключення до бази даних...');
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }
    console.log('✅ База даних підключена');

    const propertyRepo = AppDataSource.getRepository(Property);

    // 1. Отримуємо всі Off-Plan проекти
    console.log('📖 Завантаження Off-Plan проектів...');
    const offPlanProjects = await propertyRepo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name']
    });

    // Створюємо словник для швидкого пошуку за назвою (довші назви спочатку)
    const sortedProjects = [...offPlanProjects]
      .filter(p => p.name && p.name.length > 3)
      .sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));

    console.log(`📊 Знайдено ${sortedProjects.length} Off-Plan проектів для зіставлення.`);

    // 2. Отримуємо всі Secondary об'єкти
    console.log('📖 Завантаження Secondary об\'єктів...');
    const secondaryProperties = await propertyRepo.find({
      where: { propertyType: PropertyType.SECONDARY },
      select: ['id', 'name', 'buildingName', 'description', 'parentProjectId']
    });

    console.log(`📊 Аналіз ${secondaryProperties.length} Secondary об'єктів...`);

    let matchedCount = 0;
    let alreadyLinked = 0;
    const savePromises: Promise<any>[] = [];

    for (const property of secondaryProperties) {
      if (property.parentProjectId) {
        alreadyLinked++;
        continue;
      }

      let bestMatch: Property | null = null;
      
      // Спершу перевіряємо buildingName
      if (property.buildingName) {
        const bName = property.buildingName.toLowerCase().trim();
        bestMatch = sortedProjects.find(op => op.name?.toLowerCase().trim() === bName) || null;
      }

      // Якщо не знайшли за точною назвою будівлі, шукаємо входження назви проекту в опис або ім'я
      if (!bestMatch) {
        const searchText = `${property.name} ${property.buildingName || ''} ${property.description || ''}`.toLowerCase();
        for (const project of sortedProjects) {
          if (project.name && searchText.includes(project.name.toLowerCase().trim())) {
            bestMatch = project;
            break; // Беремо найдовший збіг першим (бо список відсортований)
          }
        }
      }

      if (bestMatch) {
        property.parentProjectId = bestMatch.id;
        savePromises.push(propertyRepo.save(property));
        matchedCount++;
      }
    }

    console.log(`\n💾 Знайдено ${matchedCount} нових збігів. Оновлення бази даних...`);
    
    const chunkSize = 50;
    for (let i = 0; i < savePromises.length; i += chunkSize) {
      const chunk = savePromises.slice(i, i + chunkSize);
      await Promise.all(chunk);
      process.stdout.write(`\r   Прогрес: ${Math.min(i + chunkSize, savePromises.length)}/${savePromises.length}`);
    }

    console.log(`\n\n📈 ПІДСУМОК:`);
    console.log(`   ✅ Нових зв'язків встановлено: ${matchedCount}`);
    console.log(`   ℹ️ Вже було зв'язано: ${alreadyLinked}`);
    console.log(`   ❌ Не вдалося зметчити: ${secondaryProperties.length - matchedCount - alreadyLinked}`);

  } catch (error) {
    console.error('❌ Помилка під час лінкування:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

linkSecondaryToProjects();
