import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function matchByDescription() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const searchTerm = "Velora and Venera at The Valley".toLowerCase();
    console.log(`🔍 Searching for: "${searchTerm}" in descriptions...`);

    // Знаходимо всі Secondary, які ще не мають мапінгу (або мають заглушку)
    const secondary = await repo.find({
        where: { propertyType: PropertyType.SECONDARY },
        select: ['id', 'name', 'description', 'buildingName', 'photos']
    });

    let foundCount = 0;
    const matchedItems: any[] = [];

    secondary.forEach(s => {
        const desc = (s.description || '').toLowerCase();
        if (desc.includes(searchTerm)) {
            foundCount++;
            matchedItems.push({
                id: s.id,
                name: s.name,
                building: s.buildingName
            });
        }
    });

    console.log(`\n✅ Знайдено збігів: **${foundCount}**`);
    if (foundCount > 0) {
        console.log(`Приклади знайдених об'єктів:`);
        matchedItems.slice(0, 5).forEach(m => {
            console.log(` - ${m.name} (${m.building || 'назва будівлі відсутня'})`);
        });
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

matchByDescription();
