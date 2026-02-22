import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';

async function removeDuplicates() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        // First, let's see what we're about to delete
        console.log('\n📊 Аналіз перед видаленням...\n');

        const duplicatesCountQuery = `
      SELECT COUNT(*) as total_duplicates
      FROM properties p1
      WHERE EXISTS (
        SELECT 1
        FROM properties p2
        WHERE p2.name = p1.name
        AND p2."updatedAt" > p1."updatedAt"
      );
    `;

        const duplicatesCount = await AppDataSource.query(duplicatesCountQuery);
        console.log(`Буде видалено записів: ${duplicatesCount[0].total_duplicates}`);

        // Show some examples of what will be deleted
        console.log('\n📋 Приклади записів, які будуть видалені (перші 10):\n');

        const examplesQuery = `
      SELECT 
        p1.name,
        p1.id,
        p1."createdAt",
        p1."updatedAt",
        'буде видалено' as status
      FROM properties p1
      WHERE EXISTS (
        SELECT 1
        FROM properties p2
        WHERE p2.name = p1.name
        AND p2."updatedAt" > p1."updatedAt"
      )
      ORDER BY p1.name
      LIMIT 10;
    `;

        const examples = await AppDataSource.query(examplesQuery);
        console.table(examples);

        console.log('\n📋 Приклади записів, які залишаться (перші 10):\n');

        const keepExamplesQuery = `
      WITH ranked_properties AS (
        SELECT 
          id,
          name,
          "createdAt",
          "updatedAt",
          ROW_NUMBER() OVER (PARTITION BY name ORDER BY "updatedAt" DESC) as rn
        FROM properties
      )
      SELECT 
        name,
        id,
        "createdAt",
        "updatedAt",
        'залишиться' as status
      FROM ranked_properties
      WHERE rn = 1
      AND name IN (
        SELECT name
        FROM properties
        GROUP BY name
        HAVING COUNT(*) > 1
      )
      LIMIT 10;
    `;

        const keepExamples = await AppDataSource.query(keepExamplesQuery);
        console.table(keepExamples);

        // Ask for confirmation
        console.log('\n⚠️  УВАГА! Це видалить всі старіші дублікати, залишивши тільки найновіші записи (за updatedAt).\n');
        console.log('Для продовження виконання, запустіть скрипт з параметром --confirm:\n');
        console.log('npx ts-node src/scripts/remove-duplicates-by-name.ts --confirm\n');

        // Check if --confirm flag is present
        const confirmFlag = process.argv.includes('--confirm');

        if (!confirmFlag) {
            console.log('❌ Видалення скасовано. Додайте --confirm для виконання.');
            await AppDataSource.destroy();
            return;
        }

        console.log('\n🗑️  Починаємо видалення дублікатів...\n');

        // Delete duplicates - keep only the record with the latest updatedAt for each name
        const deleteQuery = `
      DELETE FROM properties
      WHERE id IN (
        SELECT p1.id
        FROM properties p1
        WHERE EXISTS (
          SELECT 1
          FROM properties p2
          WHERE p2.name = p1.name
          AND p2."updatedAt" > p1."updatedAt"
        )
      );
    `;

        const result = await AppDataSource.query(deleteQuery);

        console.log(`✅ Видалено ${duplicatesCount[0].total_duplicates} дублікатів\n`);

        // Verify the result
        console.log('📊 Перевірка результату:\n');

        const finalStatsQuery = `
      SELECT 
        COUNT(*) as total_properties,
        COUNT(DISTINCT name) as unique_names,
        COUNT(*) - COUNT(DISTINCT name) as remaining_duplicates
      FROM properties;
    `;

        const finalStats = await AppDataSource.query(finalStatsQuery);
        console.table(finalStats);

        if (finalStats[0].remaining_duplicates > 0) {
            console.log('\n⚠️  Увага! Залишилися дублікати. Можливо, деякі записи мають однакову дату updatedAt.');

            // Show remaining duplicates
            const remainingDupsQuery = `
        SELECT name, COUNT(*) as count
        FROM properties
        GROUP BY name
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 10;
      `;

            const remainingDups = await AppDataSource.query(remainingDupsQuery);
            console.log('\nПерші 10 назв з дублікатами, що залишилися:');
            console.table(remainingDups);
        } else {
            console.log('\n✅ Всі дублікати успішно видалені!');
        }

        await AppDataSource.destroy();
        console.log('\n✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

removeDuplicates();
