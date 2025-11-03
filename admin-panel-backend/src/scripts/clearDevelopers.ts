import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';

async function clearDevelopers() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const developerRepository = AppDataSource.getRepository(Developer);
    
    // Get count before deletion
    const countBefore = await developerRepository.count();
    console.log(`📊 Found ${countBefore} developers in database`);

    if (countBefore === 0) {
      console.log('✅ Database is already empty');
      await AppDataSource.destroy();
      return;
    }

    // Delete all developers using CASCADE to handle foreign key constraints
    console.log('🗑️  Deleting all developers...');
    // First, set all property developerId to NULL to avoid constraint issues
    await AppDataSource.query(`
      UPDATE properties 
      SET "developerId" = NULL 
      WHERE "developerId" IS NOT NULL
    `);
    // Then delete all developers
    await AppDataSource.query('TRUNCATE TABLE developers CASCADE');
    
    // Verify deletion
    const countAfter = await developerRepository.count();
    console.log(`✅ Successfully deleted ${countBefore} developers`);
    console.log(`📊 Remaining developers: ${countAfter}`);

    await AppDataSource.destroy();
    console.log('✅ Done');
  } catch (error: any) {
    console.error('❌ Error clearing developers:', error);
    process.exit(1);
  }
}

clearDevelopers();

