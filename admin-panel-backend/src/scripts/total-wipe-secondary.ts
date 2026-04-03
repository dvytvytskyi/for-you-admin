import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

const PLACEHOLDER_LOGO = 'https://foryou-realestate.com/logo.png';

async function totalWipeSecondary() {
  try {
    console.log('🔄 Підключення до бази даних...');
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const propertyRepo = AppDataSource.getRepository(Property);

    console.log('🧹 Початок ПОВНОГО зачищення фото для Secondary...');
    
    // Використовуємо QueryBuilder для масового оновлення для швидкості
    const result = await propertyRepo.createQueryBuilder()
      .update(Property)
      .set({ photos: PLACEHOLDER_LOGO as any })
      .where('propertyType = :type', { type: PropertyType.SECONDARY })
      .execute();

    console.log(`\n✅ ГОТОВО!`);
    console.log(`   🗑 Видалено фото та встановлено заглушку для: ${result.affected} об'єктів.`);
    console.log(`   🚀 Тепер категорія Secondary повністю чиста.`);

  } catch (error) {
    console.error('❌ Помилка під час зачищення:', error);
  } finally {
    process.exit(0);
  }
}

totalWipeSecondary();
