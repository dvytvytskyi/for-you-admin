import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function countProperties() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const propertyRepo = AppDataSource.getRepository(Property);

    const [totalCount, offPlanCount, secondaryCount] = await Promise.all([
      propertyRepo.count(),
      propertyRepo.count({ where: { propertyType: PropertyType.OFF_PLAN } }),
      propertyRepo.count({ where: { propertyType: PropertyType.SECONDARY } }),
    ]);

    console.log('\n📊 Статистика по проектах:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Загальна кількість: ${totalCount.toLocaleString()}`);
    console.log(`🏗️  Off-Plan: ${offPlanCount.toLocaleString()}`);
    console.log(`🏠 Secondary: ${secondaryCount.toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await AppDataSource.destroy();
    console.log('✅ Done');
  } catch (error: any) {
    console.error('❌ Error counting properties:', error);
    process.exit(1);
  }
}

countProperties();

