import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function checkOffPlanStatus() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const repo = AppDataSource.getRepository(Property);
    
    // Count total off-plan
    const totalOffPlan = await repo.count({ where: { propertyType: PropertyType.OFF_PLAN } });
    console.log(`\n📊 Загальна кількість off-plan: ${totalOffPlan}`);
    
    // Check creation dates
    const offPlanProperties = await repo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 10
    });
    
    console.log(`\n📅 Останні 10 off-plan properties (за датою створення):`);
    offPlanProperties.forEach((prop, index) => {
      console.log(`   ${index + 1}. ${prop.name}`);
      console.log(`      Created: ${prop.createdAt}`);
      console.log(`      ID: ${prop.id}`);
      console.log('');
    });
    
    // Check oldest off-plan
    const oldestOffPlan = await repo.findOne({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'createdAt'],
      order: { createdAt: 'ASC' }
    });
    
    if (oldestOffPlan) {
      console.log(`\n📅 Найстаріший off-plan property:`);
      console.log(`   Name: ${oldestOffPlan.name}`);
      console.log(`   Created: ${oldestOffPlan.createdAt}`);
      console.log(`   ID: ${oldestOffPlan.id}`);
    }
    
    // Check properties without required fields
    const propertiesWithoutName = await repo.count({
      where: {
        propertyType: PropertyType.OFF_PLAN,
        name: '' as any
      }
    });
    
    console.log(`\n🔍 Перевірка даних:`);
    console.log(`   Properties без назви: ${propertiesWithoutName}`);
    
    // Check properties count by date ranges
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentCount = await repo
      .createQueryBuilder('p')
      .where('p.propertyType = :type', { type: PropertyType.OFF_PLAN })
      .andWhere('p.createdAt >= :date', { date: oneWeekAgo })
      .getCount();
    
    const monthCount = await repo
      .createQueryBuilder('p')
      .where('p.propertyType = :type', { type: PropertyType.OFF_PLAN })
      .andWhere('p.createdAt >= :date', { date: oneMonthAgo })
      .getCount();
    
    console.log(`\n📈 Статистика за періодами:`);
    console.log(`   За останній тиждень: ${recentCount}`);
    console.log(`   За останній місяць: ${monthCount}`);
    
    // Check for properties with null/empty photos (photos is stored as text, not array)
    // TypeORM simple-array stores as text with comma separation
    const allOffPlan = await repo.find({
      where: { propertyType: PropertyType.OFF_PLAN },
      select: ['id', 'name', 'photos']
    });
    
    const propertiesWithoutPhotos = allOffPlan.filter(p => 
      !p.photos || p.photos.length === 0 || (Array.isArray(p.photos) && p.photos.length === 0)
    ).length;
    
    console.log(`\n📸 Properties без фото: ${propertiesWithoutPhotos}`);
    
    await AppDataSource.destroy();
    console.log('\n✅ Done');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

checkOffPlanStatus();

