import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';
import { translate } from '@vitalets/google-translate-api';
import { IsNull } from 'typeorm';

async function translateDevelopers() {
    try {
        console.log('Connecting to database...');
        await AppDataSource.initialize();
        console.log('Connected.');

        const repo = AppDataSource.getRepository(Developer);

        // Step 1: Migration - move current Russian text to descriptionRu if it's currently in 'description'
        // We assume if descriptionRu is null, the value in description is Russian.
        const developersToMigrate = await repo.find({
            where: {
                descriptionRu: IsNull()
            }
        });

        console.log(`Found ${developersToMigrate.length} developers needing initial migration/translation.`);

        let totalProcessed = 0;

        for (const dev of developersToMigrate) {
            if (!dev.description || dev.description.trim() === '') {
                console.log(`Skipping "${dev.name}" (empty description)`);
                dev.descriptionRu = '';
                await repo.save(dev);
                continue;
            }

            console.log(`\n--- Processing: "${dev.name}" (${dev.id}) ---`);

            try {
                // 1. Current text is Russian, save it to descriptionRu
                const russianText = dev.description;
                dev.descriptionRu = russianText;

                // 2. Translate to English
                console.log(`   Translating to English...`);
                const res = await translate(russianText, { to: 'en' });

                if (res && res.text) {
                    dev.description = res.text;

                    // Also handle nameRu if empty
                    if (!dev.nameRu) {
                        dev.nameRu = dev.name; // Keep name as is for now since it's mostly English
                    }

                    await repo.save(dev);
                    totalProcessed++;
                    console.log(`   ✅ Success. Translated text snippet: ${res.text.substring(0, 50)}...`);
                } else {
                    console.log(`   ⚠️ Translation returned empty result.`);
                }
            } catch (err: any) {
                console.error(`   ❌ Translation error for "${dev.name}": ${err.message}`);

                if (err.message.includes('Too Many Requests') || err.message.includes('429')) {
                    console.log('   🛑 Rate limited. Sleeping for 10 minutes...');
                    await new Promise(r => setTimeout(r, 600000));
                    continue;
                }
                await new Promise(r => setTimeout(r, 5000));
            }

            // Polite delay to avoid getting blocked
            await new Promise(r => setTimeout(r, 3000));
        }

        console.log(`\n🎉 Done! Total developers translated: ${totalProcessed}`);
        process.exit(0);
    } catch (error) {
        console.error('💥 Fatal error in translate script:', error);
        process.exit(1);
    }
}

translateDevelopers();
