import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';
import { Property } from '../entities/Property';

async function removeDevelopersWithoutData() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const developerRepository = AppDataSource.getRepository(Developer);
    const propertyRepository = AppDataSource.getRepository(Property);

    // Get all developers
    const allDevelopers = await developerRepository.find();
    console.log(`📊 Total developers in database: ${allDevelopers.length}\n`);

    // Find developers without data
    const developersWithoutData: Developer[] = [];
    const developersWithData: Developer[] = [];

    for (const dev of allDevelopers) {
      const hasLogo = !!dev.logo;
      const hasDescription = !!dev.description;
      const hasImages = dev.images && dev.images.length > 0;

      if (!hasLogo && !hasDescription && !hasImages) {
        developersWithoutData.push(dev);
      } else {
        developersWithData.push(dev);
      }
    }

    console.log(`📊 Statistics:`);
    console.log(`  ✅ Developers with data: ${developersWithData.length}`);
    console.log(`  ❌ Developers without data: ${developersWithoutData.length}\n`);

    if (developersWithoutData.length === 0) {
      console.log('✅ All developers have data. Nothing to remove.');
      await AppDataSource.destroy();
      return;
    }

    // Check which developers are used in properties
    console.log('🔍 Checking which developers are used in properties...\n');
    
    const developersToRemove: Developer[] = [];
    const developersInUse: Array<{ developer: Developer; propertyCount: number }> = [];

    for (const dev of developersWithoutData) {
      const propertyCount = await propertyRepository.count({
        where: { developerId: dev.id },
      });

      if (propertyCount > 0) {
        developersInUse.push({ developer: dev, propertyCount });
      } else {
        developersToRemove.push(dev);
      }
    }

    console.log(`📊 Analysis:`);
    console.log(`  ✅ Can be removed safely: ${developersToRemove.length}`);
    console.log(`  ⚠️  Used in properties: ${developersInUse.length}\n`);

    if (developersInUse.length > 0) {
      console.log('⚠️  Developers used in properties (will set developerId = NULL):');
      developersInUse.slice(0, 10).forEach(({ developer, propertyCount }) => {
        console.log(`  - ${developer.name}: used in ${propertyCount} properties`);
      });
      if (developersInUse.length > 10) {
        console.log(`  ... and ${developersInUse.length - 10} more\n`);
      } else {
        console.log('');
      }
    }

    // Ask for confirmation (in production, we'll use --apply flag)
    const args = process.argv.slice(2);
    const shouldApply = args.includes('--apply');

    if (!shouldApply) {
      console.log('⚠️  DRY RUN MODE - No changes will be made');
      console.log('   To apply changes, run with --apply flag\n');
      console.log(`📋 Summary:`);
      console.log(`  - Will remove: ${developersToRemove.length} developers`);
      console.log(`  - Will set developerId = NULL for: ${developersInUse.length} developers`);
      console.log(`  - Total developers to remove: ${developersWithoutData.length}`);
      console.log(`  - Developers that will remain: ${developersWithData.length}\n`);
      await AppDataSource.destroy();
      return;
    }

    console.log('🚀 Applying changes...\n');

    // First, set developerId = NULL for properties that use developers without data
    let propertiesUpdated = 0;
    for (const { developer, propertyCount } of developersInUse) {
      await propertyRepository.update(
        { developerId: developer.id },
        { developerId: null as any }
      );
      propertiesUpdated += propertyCount;
      console.log(`  ✓ Set developerId = NULL for ${propertyCount} properties (${developer.name})`);
    }

    if (propertiesUpdated > 0) {
      console.log(`\n  ✅ Updated ${propertiesUpdated} properties\n`);
    }

    // Now remove all developers without data
    let removedCount = 0;
    for (const dev of developersWithoutData) {
      await developerRepository.remove(dev);
      removedCount++;
      if (removedCount % 10 === 0) {
        console.log(`  ✓ Removed ${removedCount} developers...`);
      }
    }

    console.log(`\n✅ Successfully removed ${removedCount} developers\n`);

    // Final count
    const finalCount = await developerRepository.count();
    console.log(`📊 Final statistics:`);
    console.log(`  ✅ Developers remaining: ${finalCount}`);
    console.log(`  ✅ All remaining developers have data (logo, description, or images)\n`);

    await AppDataSource.destroy();
    console.log('✅ Done');
  } catch (error: any) {
    console.error('❌ Error removing developers:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

removeDevelopersWithoutData();

