
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { translate } from '@vitalets/google-translate-api';

async function translateAreas() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(Area);
        const areas = await repo.find();

        console.log(`Found ${areas.length} areas. Checking descriptions...`);

        let updatedCount = 0;

        for (const area of areas) {
            let descData: any = area.description;

            // 1. Normalize Data Structure
            let enText = '';
            let ruText = '';

            if (!descData) {
                // No description at all. Try to generate or skip? 
                // User said "translate descriptions", assuming they exist.
                // If they don't exist, maybe we leave them empty?
                // Or maybe description is in `description.description`?
                continue;
            }

            // Handle the weird double-encoded JSON case we saw
            if (descData.description && typeof descData.description === 'string' && descData.description.startsWith('{')) {
                try {
                    const innerRes = JSON.parse(descData.description);
                    if (innerRes.en && innerRes.en.description) enText = innerRes.en.description;
                    if (innerRes.ru && innerRes.ru.description) ruText = innerRes.ru.description;
                } catch (e) {
                    console.log(`Failed to parse inner JSON for area ${area.id}`);
                }
            }
            // Handle standard { title, description } case (if any)
            else if (descData.description && typeof descData.description === 'string') {
                // Assume it's English by default? Or detect?
                // Let's assume En if not specified
                enText = descData.description;
            }
            else if (typeof descData === 'string') {
                enText = descData;
            }
            else if (descData.en || descData.ru) {
                // Already in target format?
                enText = descData.en || '';
                ruText = descData.ru || '';
            }

            // Check if we found anything
            if (!enText && !ruText) {
                console.log(`Skipping ${area.nameEn}: No text found to translate.`);
                continue;
            }

            console.log(`Processing ${area.nameEn}...`);

            // 2. Translate
            try {
                if (enText && !ruText) {
                    console.log('   Translating En -> Ru...');
                    const res = await translate(enText, { to: 'ru' });
                    ruText = res.text;
                } else if (ruText && !enText) {
                    console.log('   Translating Ru -> En...');
                    const res = await translate(ruText, { to: 'en' });
                    enText = res.text;
                }
            } catch (err: any) {
                console.error(`   Translation failed: ${err.message}`);
                // Continue with what we have?
            }

            // 3. Update with Clean Structure
            // We will store as { en: "...", ru: "..." }
            // NOTE: Entity defines description as { title?, description? }
            // We might want to store it in a way that respects that or just override.
            // Given the previous data was `description: { description: ... }`, let's clear it up.
            // Let's use:
            /*
              {
                  en: string,
                  ru: string
              }
            */
            // But we need to bypass TypeORM type check if strict. `jsonb` is forgiving.

            const newDesc = {
                en: enText,
                ru: ruText
            };

            area.description = newDesc as any;
            await repo.save(area);
            updatedCount++;
            console.log(`   ✅ Saved.`);

            // Sleep slightly to avoid rate limits
            await new Promise(r => setTimeout(r, 500));
        }

        console.log(`Done. Updated ${updatedCount} areas.`);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

translateAreas();
