
import { AppDataSource } from '../config/database';

async function checkDatabaseHealth() {
    console.log('Starting DB Health Check...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const queryRunner = AppDataSource.createQueryRunner();

        // 1. Check if 'areas' table has essential columns
        const areasColumns = await queryRunner.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'areas' AND column_name IN ('slug', 'isactive', 'mainimage');
    `);

        const hasAreasSlug = areasColumns.some((c: any) => c.column_name === 'slug');
        if (!hasAreasSlug) {
            console.error('CRITICAL: Table "areas" is missing "slug" column!');
            process.exit(1);
        }

        // 2. Check if 'properties' table has essential columns
        const propertiesColumns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'properties' AND column_name IN ('slug', 'projectedroi', 'isinvestorfeatured');
    `);

        const hasPropertiesSlug = propertiesColumns.some((c: any) => c.column_name === 'slug');
        const hasProjectedRoi = propertiesColumns.some((c: any) => c.column_name === 'projectedroi');

        if (!hasPropertiesSlug || !hasProjectedRoi) {
            console.error('CRITICAL: Table "properties" is missing required columns (slug or projectedroi)!');
            process.exit(1);
        }

        console.log('✅ DB Health Check Passed: All critical columns exist.');
        process.exit(0);

    } catch (error) {
        console.error('DB Health Check Failed:', error);
        process.exit(1);
    }
}

checkDatabaseHealth();
