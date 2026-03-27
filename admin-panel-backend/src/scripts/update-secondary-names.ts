import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as dotenv from 'dotenv';

dotenv.config();

async function updateSecondaryNames() {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    console.log('🔄 Підключення до бази даних...');
    const propertyRepo = AppDataSource.getRepository(Property);

    console.log('📖 Пошук об\'єктів Secondary для оновлення назв...');
    
    // Беремо всі secondary, у яких є parentProjectId
    const properties = await propertyRepo.find({
        where: { propertyType: PropertyType.SECONDARY },
        relations: ['parentProject'],
        select: {
            id: true,
            name: true,
            description: true,
            parentProject: {
                id: true,
                name: true
            }
        }
    });

    console.log(`📊 Знайдено ${properties.length} об'єктів для аналізу.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < properties.length; i++) {
        const prop = properties[i];
        
        let parentName = prop.parentProject?.name || '';
        let h1Content = '';

        // Витягуємо H1 з опису за допомогою regex
        const h1Match = prop.description ? prop.description.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) : null;
        if (h1Match && h1Match[1]) {
            h1Content = h1Match[1].replace(/<[^>]*>/g, '').trim(); // очищаємо від вкладених тегів
        }

        let newName = '';
        if (parentName && h1Content) {
            newName = `${parentName}, ${h1Content}`;
        } else if (parentName) {
            newName = parentName;
        } else if (h1Content) {
            newName = h1Content;
        }

        if (newName && newName !== prop.name) {
            prop.name = newName;
            await propertyRepo.save(prop);
            updatedCount++;
        } else {
            skippedCount++;
        }

        if ((i + 1) % 100 === 0) {
            console.log(`⏳ Оброблено ${i + 1} / ${properties.length}...`);
        }
    }

    console.log(`\n✅ Готово!`);
    console.log(`📈 Оновлено назв: ${updatedCount}`);
    console.log(`ℹ️ Пропущено: ${skippedCount}`);
    
    await AppDataSource.destroy();
}

updateSecondaryNames().catch(error => {
    console.error('❌ Помилка під час оновлення назв:', error);
    process.exit(1);
});
