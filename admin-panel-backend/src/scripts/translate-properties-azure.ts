
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';

dotenv.config();

const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY;
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION;
const ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

if (!AZURE_KEY || !AZURE_REGION) {
    console.error('Missing AZURE_TRANSLATOR_KEY or AZURE_TRANSLATOR_REGION in .env');
    process.exit(1);
}

async function translateText(text: string): Promise<string | null> {
    try {
        const response = await axios({
            baseURL: ENDPOINT,
            url: '/translate',
            method: 'post',
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_KEY,
                'Ocp-Apim-Subscription-Region': AZURE_REGION,
                'Content-type': 'application/json',
                'X-ClientTraceId': crypto.randomUUID().toString(),
            },
            params: {
                'api-version': '3.0',
                from: 'en',
                to: 'ru',
            },
            data: [{
                'text': text
            }],
            responseType: 'json'
        });

        if (response.data && response.data[0] && response.data[0].translations) {
            return response.data[0].translations[0].text;
        }
        return null;
    } catch (error: any) {
        console.error('Translation API error:', error.response?.data || error.message);
        return null;
    }
}

async function run() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const propertyRepo = AppDataSource.getRepository(Property);

        // Filter for off-plan properties that need translation
        // descriptionRu is null OR descriptionRu is empty string
        // TypeORM QueryBuilder is robust for this
        let hasMore = true;

        while (hasMore) {
            const properties = await propertyRepo.createQueryBuilder('property')
                .where('property.propertyType = :type', { type: PropertyType.OFF_PLAN })
                .andWhere('(property.descriptionRu IS NULL OR property.descriptionRu = :empty)', { empty: '' })
                .andWhere('property.description IS NOT NULL')
                .andWhere("property.description != ''")
                .take(10) // Process in small batches
                .getMany();

            if (properties.length === 0) {
                console.log('No more properties to translate.');
                hasMore = false;
                break;
            }

            console.log(`Processing batch of ${properties.length} properties...`);

            for (const prop of properties) {
                console.log(`Translating: "${prop.name}" (${prop.id})`);

                // Basic cleanup of source text if needed, but we did global cleanup already
                const translatedDescription = await translateText(prop.description);

                if (translatedDescription) {
                    prop.descriptionRu = translatedDescription;
                    await propertyRepo.save(prop);
                    console.log(`✅ Saved translation for: ${prop.name}`);
                } else {
                    console.log(`❌ Failed to translate: ${prop.name}`);
                }

                // Sleep slightly to be polite to the API, though Azure handles high throughput
                await new Promise(r => setTimeout(r, 200));
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Script error:', error);
        process.exit(1);
    }
}

run();
