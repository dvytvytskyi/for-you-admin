
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { translate } from '@vitalets/google-translate-api';
import { IsNull, Not } from 'typeorm';

async function translateProperties() {
    try {
        console.log('Connecting to database...');
        await AppDataSource.initialize();
        console.log('Connected.');

        const repo = AppDataSource.getRepository(Property);

        // Batch size to avoid heavy memory usage and process reliably
        const BATCH_SIZE = 10;

        let totalProcessed = 0;

        while (true) {
            // Find properties where descriptionRu is null
            const properties = await repo.find({
                where: {
                    descriptionRu: IsNull(),
                    propertyType: PropertyType.OFF_PLAN
                },
                take: BATCH_SIZE,
                order: {
                    createdAt: 'DESC'
                }
            });

            if (properties.length === 0) {
                console.log('✅ No more properties without Russian translation found.');
                break;
            }

            console.log(`\n--- Processing batch of ${properties.length} properties ---`);

            for (const property of properties) {
                if (!property.description || property.description.trim() === '') {
                    console.log(`Skipping "${property.name}" (empty description)`);
                    property.descriptionRu = ''; // Mark as processed
                    await repo.save(property);
                    continue;
                }

                console.log(`Translating: "${property.name}" (${property.id})`);
                try {
                    // Perform translation
                    const res = await translate(property.description, { to: 'ru' });

                    if (res && res.text) {
                        property.descriptionRu = res.text;
                        await repo.save(property);
                        totalProcessed++;
                        console.log(`   ✅ Success. Total translated: ${totalProcessed}`);
                    } else {
                        console.log(`   ⚠️ Translation returned empty result.`);
                    }
                } catch (err: any) {
                    console.error(`   ❌ Translation error for "${property.name}": ${err.message}`);

                    if (err.message.includes('Too Many Requests') || err.message.includes('429')) {
                        console.log('   🛑 Rate limited. Sleeping for 10 minutes...');
                        await new Promise(r => setTimeout(r, 600000));
                        // We don't mark as processed, so it will be retried in the next batch or iteration
                        continue;
                    }

                    // For other errors, maybe wait a bit
                    await new Promise(r => setTimeout(r, 10000));
                }

                // polite delay to avoid getting blocked
                await new Promise(r => setTimeout(r, 10000));
            }

            // Short break between batches
            await new Promise(r => setTimeout(r, 10000));
        }

        console.log(`\n🎉 Done! Total properties translated in this session: ${totalProcessed}`);
        process.exit(0);
    } catch (error) {
        console.error('💥 Fatal error in translate script:', error);
        process.exit(1);
    }
}

translateProperties();
