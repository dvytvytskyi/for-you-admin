import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';

async function checkDevelopersData() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const developerRepository = AppDataSource.getRepository(Developer);
    
    // Get all developers
    const developers = await developerRepository.find();
    console.log(`📊 Total developers in database: ${developers.length}\n`);

    // Check data availability
    let withLogo = 0;
    let withDescription = 0;
    let withImages = 0;
    let withAllData = 0;
    let withNoData = 0;

    const developersWithoutData: string[] = [];
    const developersWithData: any[] = [];

    for (const dev of developers) {
      const hasLogo = !!dev.logo;
      const hasDescription = !!dev.description;
      const hasImages = dev.images && dev.images.length > 0;

      if (hasLogo) withLogo++;
      if (hasDescription) withDescription++;
      if (hasImages) withImages++;
      
      if (hasLogo && hasDescription && hasImages) {
        withAllData++;
        developersWithData.push({
          name: dev.name,
          logo: dev.logo?.substring(0, 50) + '...',
          descriptionLength: dev.description?.length || 0,
          imagesCount: dev.images?.length || 0,
        });
      } else if (!hasLogo && !hasDescription && !hasImages) {
        withNoData++;
        developersWithoutData.push(dev.name);
      }
    }

    console.log('📊 Statistics:');
    console.log(`  ✅ With logo: ${withLogo} (${((withLogo / developers.length) * 100).toFixed(1)}%)`);
    console.log(`  ✅ With description: ${withDescription} (${((withDescription / developers.length) * 100).toFixed(1)}%)`);
    console.log(`  ✅ With images: ${withImages} (${((withImages / developers.length) * 100).toFixed(1)}%)`);
    console.log(`  ✅ With all data (logo + description + images): ${withAllData} (${((withAllData / developers.length) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Without any data: ${withNoData} (${((withNoData / developers.length) * 100).toFixed(1)}%)\n`);

    if (developersWithData.length > 0) {
      console.log('✅ Developers with complete data (first 5):');
      developersWithData.slice(0, 5).forEach(dev => {
        console.log(`  - ${dev.name}: logo=${!!dev.logo}, desc=${dev.descriptionLength} chars, images=${dev.imagesCount}`);
      });
      console.log('');
    }

    if (developersWithoutData.length > 0) {
      console.log(`❌ Developers without data (${developersWithoutData.length}):`);
      developersWithoutData.slice(0, 20).forEach(name => {
        console.log(`  - ${name}`);
      });
      if (developersWithoutData.length > 20) {
        console.log(`  ... and ${developersWithoutData.length - 20} more`);
      }
      console.log('');
    }

    // Check database columns
    console.log('🔍 Checking database columns...');
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    
    try {
      const columns = await queryRunner.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'developers'
        ORDER BY ordinal_position
      `);
      
      console.log('  Database columns:');
      columns.forEach((col: any) => {
        console.log(`    - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } finally {
      await queryRunner.release();
    }

    await AppDataSource.destroy();
    console.log('\n✅ Check completed!');
  } catch (error: any) {
    console.error('❌ Error checking developers data:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

checkDevelopersData();

