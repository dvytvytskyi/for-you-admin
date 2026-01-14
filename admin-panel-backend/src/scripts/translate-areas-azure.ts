
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY;
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION;
const AZURE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';

if (!AZURE_KEY || !AZURE_REGION) {
    console.error("Missing Azure Translator credentials (AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_REGION)");
    // Don't exit, just warn, maybe we can run without translation if only structure update is needed? 
    // But this script PURPOSE is translation.
    // process.exit(1);
}

async function translateText(text: string, to: string = 'ru'): Promise<string> {
    if (!text || !text.trim()) return '';
    if (!AZURE_KEY) return text;

    try {
        const response = await axios.post(AZURE_ENDPOINT, [{ 'Text': text }], {
            params: { to },
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_KEY,
                'Ocp-Apim-Subscription-Region': AZURE_REGION,
                'Content-Type': 'application/json'
            }
        });
        return response.data[0]?.translations[0]?.text || text;
    } catch (error: any) {
        console.error('Translation error:', error.response?.data || error.message);
        return text; // Return original on error
    }
}

async function main() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");

        const areaRepo = AppDataSource.getRepository(Area);
        const areas = await areaRepo.find();

        console.log(`Found ${areas.length} areas`);

        for (const area of areas) {
            // Check if ALREADY fully translated
            if (area.descriptionRu && area.descriptionRu.description && area.descriptionRu.title) {
                // console.log(`Skipping area ${area.nameEn}: Already has RU description`);
                continue;
            }

            const desc = area.description;
            if (!desc) {
                console.log(`Skipping area ${area.nameEn}: No description to translate`);
                continue;
            }

            console.log(`Processing area: ${area.nameEn}`);

            let title = '';
            let description = '';

            if (typeof desc === 'string') {
                description = desc;
                title = area.nameEn;
            } else {
                title = desc.title || area.nameEn;
                description = desc.description || '';
            }

            if (!description && !title) continue;

            // Translate if missing
            const existingRu = area.descriptionRu || { title: '', description: '' };

            let titleRu = existingRu.title || '';
            let descriptionRu = existingRu.description || '';
            let changed = false;

            if (!titleRu && title) {
                console.log(`Translating title...`);
                titleRu = await translateText(title, 'ru');
                changed = true;
            }

            if (!descriptionRu && description) {
                console.log(`Translating description...`);
                // Azure limit is 5000 chars. Split if needed? 
                // Usually descriptions are shorter.
                if (description.length > 5000) {
                    console.warn("Description too long for single request, truncating for now");
                    description = description.substring(0, 5000);
                }
                descriptionRu = await translateText(description, 'ru');
                changed = true;
            }

            if (changed) {
                area.descriptionRu = {
                    title: titleRu,
                    description: descriptionRu
                };

                await areaRepo.save(area);
                console.log(`Updated area: ${area.nameEn}`);
            }
        }

        console.log("Translation complete.");
        process.exit(0);
    } catch (err) {
        console.error("Script error:", err);
        process.exit(1);
    }
}

main();
