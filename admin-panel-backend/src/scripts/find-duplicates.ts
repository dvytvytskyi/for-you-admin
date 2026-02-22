import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';

async function findDuplicates() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const propertyRepository = AppDataSource.getRepository(Property);

        // Find duplicates by name
        const duplicatesQuery = `
      SELECT 
        name,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as ids,
        STRING_AGG("createdAt"::text, ', ') as created_dates
      FROM properties
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY count DESC, name
    `;

        const duplicates = await AppDataSource.query(duplicatesQuery);

        console.log('\n📊 ДУБЛІКАТИ ПРОЕКТІВ ЗА НАЗВОЮ:\n');
        console.log('='.repeat(80));

        if (duplicates.length === 0) {
            console.log('✅ Дублікатів не знайдено!');
        } else {
            console.log(`❌ Знайдено ${duplicates.length} назв з дублікатами\n`);

            let totalDuplicates = 0;

            duplicates.forEach((dup: any, index: number) => {
                const duplicateCount = parseInt(dup.count) - 1; // -1 because one is the original
                totalDuplicates += duplicateCount;

                console.log(`${index + 1}. "${dup.name}"`);
                console.log(`   Кількість записів: ${dup.count}`);
                console.log(`   IDs: ${dup.ids}`);
                console.log(`   Дати створення: ${dup.created_dates}`);
                console.log('-'.repeat(80));
            });

            console.log(`\n📈 СТАТИСТИКА:`);
            console.log(`   Унікальних назв з дублікатами: ${duplicates.length}`);
            console.log(`   Загальна кількість дублікатів (зайвих записів): ${totalDuplicates}`);
            console.log(`   Загальна кількість всіх записів з дублікатами: ${duplicates.reduce((sum: number, d: any) => sum + parseInt(d.count), 0)}`);
        }

        // Get total count of all properties
        const totalCount = await propertyRepository.count();
        console.log(`\n📊 Загальна кількість проектів в БД: ${totalCount}`);

        // Additional analysis: duplicates by type
        console.log('\n\n📊 ДУБЛІКАТИ ЗА ТИПОМ ПРОЕКТУ:\n');
        console.log('='.repeat(80));

        const duplicatesByTypeQuery = `
      SELECT 
        "propertyType",
        name,
        COUNT(*) as count,
        STRING_AGG(id::text, ', ') as ids
      FROM properties
      WHERE name IN (
        SELECT name 
        FROM properties 
        GROUP BY name 
        HAVING COUNT(*) > 1
      )
      GROUP BY "propertyType", name
      ORDER BY "propertyType", count DESC
    `;

        const duplicatesByType = await AppDataSource.query(duplicatesByTypeQuery);

        const offPlanDuplicates = duplicatesByType.filter((d: any) => d.propertyType === 'off-plan');
        const secondaryDuplicates = duplicatesByType.filter((d: any) => d.propertyType === 'secondary');

        console.log(`Off-Plan проекти з дублікатами: ${offPlanDuplicates.length}`);
        console.log(`Secondary проекти з дублікатами: ${secondaryDuplicates.length}`);

        // Show detailed duplicates info
        console.log('\n\n📋 ДЕТАЛЬНА ІНФОРМАЦІЯ ПРО ДУБЛІКАТИ:\n');
        console.log('='.repeat(80));

        const detailedDuplicatesQuery = `
      SELECT 
        p.id,
        p.name,
        p."propertyType",
        p."createdAt",
        p."updatedAt",
        c.name as country,
        ci.name as city,
        a.name as area,
        d.name as developer
      FROM properties p
      LEFT JOIN countries c ON p."countryId" = c.id
      LEFT JOIN cities ci ON p."cityId" = ci.id
      LEFT JOIN areas a ON p."areaId" = a.id
      LEFT JOIN developers d ON p."developerId" = d.id
      WHERE p.name IN (
        SELECT name 
        FROM properties 
        GROUP BY name 
        HAVING COUNT(*) > 1
      )
      ORDER BY p.name, p."createdAt"
    `;

        const detailedDuplicates = await AppDataSource.query(detailedDuplicatesQuery);

        let currentName = '';
        detailedDuplicates.forEach((prop: any) => {
            if (prop.name !== currentName) {
                currentName = prop.name;
                console.log(`\n🏢 "${prop.name}"`);
            }
            console.log(`   - ID: ${prop.id}`);
            console.log(`     Тип: ${prop.propertyType}`);
            console.log(`     Локація: ${prop.country} / ${prop.city} / ${prop.area}`);
            console.log(`     Девелопер: ${prop.developer || 'N/A'}`);
            console.log(`     Створено: ${prop.createdAt}`);
            console.log(`     Оновлено: ${prop.updatedAt}`);
        });

        await AppDataSource.destroy();
        console.log('\n✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

findDuplicates();
