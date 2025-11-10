import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';
import { Property } from '../entities/Property';

async function removeDevelopersWithoutData() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Підключено до БД\n');

    const developerRepo = AppDataSource.getRepository(Developer);
    const propertyRepo = AppDataSource.getRepository(Property);

    // Знаходимо всіх developers
    const allDevelopers = await developerRepo.find();

    console.log(`📊 Всього developers: ${allDevelopers.length}\n`);

    // Знаходимо developers без даних (без logo, images, description)
    const developersToRemove = allDevelopers.filter(dev => {
      const hasLogo = dev.logo && dev.logo.trim() !== '';
      const hasImages = dev.images && dev.images.length > 0;
      const hasDescription = dev.description && dev.description.trim() !== '';

      return !hasLogo && !hasImages && !hasDescription;
    });

    console.log(`🗑️  Developers для видалення: ${developersToRemove.length}\n`);

    if (developersToRemove.length === 0) {
      console.log('✅ Немає developers для видалення');
      await AppDataSource.destroy();
      process.exit(0);
    }

    // Показуємо список developers для видалення
    console.log('📋 Список developers для видалення:');
    for (let i = 0; i < developersToRemove.length; i++) {
      const dev = developersToRemove[i];

      // Перевіряємо, чи є у них properties
      const propertiesCount = await propertyRepo.count({
        where: { developerId: dev.id },
      });

      console.log(`   ${i + 1}. ${dev.name} (ID: ${dev.id.substring(0, 8)}...) - Properties: ${propertiesCount}`);
    }

    console.log('\n⚠️  УВАГА: Ці developers будуть видалені з бази даних!');
    console.log('   Якщо у них є properties, developerId буде встановлено в null\n');

    // Перевіряємо, чи є properties у цих developers
    let hasProperties = false;
    for (const dev of developersToRemove) {
      const count = await propertyRepo.count({
        where: { developerId: dev.id },
      });
      if (count > 0) {
        hasProperties = true;
        console.log(`   ⚠️  ${dev.name} має ${count} properties - developerId буде встановлено в null`);
      }
    }

    if (hasProperties) {
      console.log('\n   Properties з цими developers будуть оновлені (developerId = null)');
    }

    // Перевіряємо аргумент командного рядка для підтвердження
    const shouldApply = process.argv.includes('--apply');

    if (!shouldApply) {
      console.log('\n📝 Для застосування змін запустіть скрипт з флагом --apply:');
      console.log('   npm run remove:developers-without-data:apply');
      await AppDataSource.destroy();
      process.exit(0);
    }

    console.log('\n🗑️  Видалення developers...\n');

    let removedCount = 0;
    let updatedPropertiesCount = 0;

    for (const dev of developersToRemove) {
      try {
        // Оновлюємо properties, щоб встановити developerId = null
        const properties = await propertyRepo.find({
          where: { developerId: dev.id },
        });

        if (properties.length > 0) {
          await propertyRepo.update(
            { developerId: dev.id },
        { developerId: null as any }
      );
          updatedPropertiesCount += properties.length;
          console.log(`   ✓ Оновлено ${properties.length} properties для ${dev.name}`);
    }

        // Видаляємо developer
        await developerRepo.remove(dev);
      removedCount++;
        console.log(`   ✓ Видалено: ${dev.name}`);
      } catch (error: any) {
        console.error(`   ❌ Помилка при видаленні ${dev.name}: ${error.message}`);
      }
    }

    console.log('\n📊 Підсумок:');
    console.log(`   ✅ Видалено developers: ${removedCount}`);
    console.log(`   ✅ Оновлено properties: ${updatedPropertiesCount}`);

    // Показуємо фінальну статистику
    const remainingDevelopers = await developerRepo.find();
    const withLogo = remainingDevelopers.filter(d => d.logo && d.logo.trim() !== '').length;
    const withImages = remainingDevelopers.filter(d => d.images && d.images.length > 0).length;
    const withDescription = remainingDevelopers.filter(d => d.description && d.description.trim() !== '').length;

    console.log('\n📈 Фінальна статистика:');
    console.log(`   Всього developers: ${remainingDevelopers.length}`);
    console.log(`   З логотипом: ${withLogo} (${((withLogo / remainingDevelopers.length) * 100).toFixed(1)}%)`);
    console.log(`   З images: ${withImages} (${((withImages / remainingDevelopers.length) * 100).toFixed(1)}%)`);
    console.log(`   З description: ${withDescription} (${((withDescription / remainingDevelopers.length) * 100).toFixed(1)}%)`);

    await AppDataSource.destroy();
    console.log('\n✅ Готово!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Помилка:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

removeDevelopersWithoutData();
