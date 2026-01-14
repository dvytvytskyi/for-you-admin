import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

async function checkOffPlanDuplicates() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const repo = AppDataSource.getRepository(Property);

        // Count total off-plan
        const totalOffPlan = await repo.count({ where: { propertyType: PropertyType.OFF_PLAN } });
        console.log(`\n📊 Загальна кількість off-plan: ${totalOffPlan}`);

        // Check for duplicates by name
        const duplicates = await repo
            .createQueryBuilder('p')
            .select('p.name', 'name')
            .addSelect('COUNT(*)::int', 'count')
            .where('p.propertyType = :type', { type: PropertyType.OFF_PLAN })
            .groupBy('p.name')
            .having('COUNT(*) > 1')
            .getRawMany();

        console.log(`🔄 Дублікати по назві: ${duplicates.length}`);

        if (duplicates.length > 0) {
            console.log(`\nПриклади дублікатів (перші 20):`);
            duplicates.slice(0, 20).forEach((dup: any) => {
                console.log(`  - "${dup.name}": ${dup.count} разів`);
            });

            // Count total duplicates
            const totalDuplicates = duplicates.reduce((sum: number, dup: any) => sum + (dup.count - 1), 0);
            console.log(`\n📉 Загальна кількість дублікатів: ${totalDuplicates}`);
            console.log(`✅ Унікальних off-plan properties: ${totalOffPlan - totalDuplicates}`);
        } else {
            console.log(`✅ Дублікатів не знайдено`);
        }

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

checkOffPlanDuplicates();
