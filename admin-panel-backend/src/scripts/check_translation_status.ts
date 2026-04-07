
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import 'reflect-metadata';

async function checkStatus() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(Property);

        const total = await repo.count();
        const offPlanTotal = await repo.count({ where: { propertyType: PropertyType.OFF_PLAN } });
        
        const translatedOffPlan = await repo.createQueryBuilder('property')
            .where('property.propertyType = :type', { type: PropertyType.OFF_PLAN })
            .andWhere('property.descriptionRu IS NOT NULL')
            .andWhere("property.descriptionRu != ''")
            .getCount();

        const pendingOffPlan = await repo.createQueryBuilder('property')
            .where('property.propertyType = :type', { type: PropertyType.OFF_PLAN })
            .andWhere('(property.descriptionRu IS NULL OR property.descriptionRu = :empty)', { empty: '' })
            .andWhere('property.description IS NOT NULL')
            .andWhere("property.description != ''")
            .getCount();

        console.log('--- Translation Status ---');
        console.log(`Total Properties: ${total}`);
        console.log(`Off-Plan Properties: ${offPlanTotal}`);
        console.log(`  - Translated: ${translatedOffPlan}`);
        console.log(`  - Pending: ${pendingOffPlan}`);
        console.log(`  - Progression: ${((translatedOffPlan / (translatedOffPlan + pendingOffPlan)) * 100).toFixed(2)}%`);
        
        // Also check developers translation
        const devCount = await repo.query('SELECT COUNT(*) FROM developers WHERE "descriptionRu" IS NULL OR "descriptionRu" = \'\'');
        const devTotal = await repo.query('SELECT COUNT(*) FROM developers');
        console.log(`\nDevelopers:`);
        console.log(`  - Total: ${devTotal[0].count}`);
        console.log(`  - Pending: ${devCount[0].count}`);

        // Check areas translation
        const areaCount = await repo.query('SELECT COUNT(*) FROM areas WHERE "descriptionRu" IS NULL OR "descriptionRu" = \'\'');
        const areaTotal = await repo.query('SELECT COUNT(*) FROM areas');
        console.log(`\nAreas:`);
        console.log(`  - Total: ${areaTotal[0].count}`);
        console.log(`  - Pending: ${areaCount[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkStatus();
