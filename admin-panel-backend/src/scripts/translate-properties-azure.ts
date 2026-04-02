
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import axios from 'axios';
import * as dotenv from 'dotenv';
import 'reflect-metadata';

dotenv.config();


const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
    console.error('Missing GROQ_API_KEY in .env');
    process.exit(1);
}

async function translateText(text: string): Promise<string | null> {
    if (!text || text.trim() === '') return '';
    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are a professional real estate translator. Translate the given text from English to Russian. Preserve any HTML formatting if present. Provide only the translated text, no introductions or explanations.' 
                    },
                    { role: 'user', content: text }
                ],
                temperature: 0.1,
                max_tokens: 4000,
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.data && response.data.choices && response.data.choices[0]) {
            return response.data.choices[0].message.content.trim();
        }
        return null;
    } catch (error: any) {
        console.error('Groq Translation error:', error.response?.data || error.message);
        return null;
    }
}


async function run() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const propertyRepo = AppDataSource.getRepository(Property);

        const workerId = parseInt(process.env.WORKER_ID || '0');
        const totalWorkers = parseInt(process.env.TOTAL_WORKERS || '1');
        
        console.log(`Starting worker ${workerId + 1}/${totalWorkers}`);

        let hasMore = true;

        while (hasMore) {
            const query = propertyRepo.createQueryBuilder('property')
                .where('property.propertyType = :type', { type: PropertyType.OFF_PLAN })
                .andWhere('(property.descriptionRu IS NULL OR property.descriptionRu = :empty)', { empty: '' })
                .andWhere('property.description IS NOT NULL')
                .andWhere("property.description != ''");

            if (totalWorkers > 1) {
                // Use modulo of the integer part of the UUID or a hash of it to partition
                // Since TypeORM/Postgres handles this well
                query.andWhere("abs(hashtext(property.id::text)) % :total = :worker", { total: totalWorkers, worker: workerId });
            }

            const properties = await query
                .take(10) // Process in small batches
                .getMany();

            if (properties.length === 0) {
                console.log(`Worker ${workerId}: No more properties to translate.`);
                hasMore = false;
                break;
            }

            console.log(`Worker ${workerId}: Processing batch of ${properties.length} properties...`);

            for (const prop of properties) {
                console.log(`Worker ${workerId}: Translating: "${prop.name}" (${prop.id})`);

                const translatedDescription = await translateText(prop.description);

                if (translatedDescription) {
                    prop.descriptionRu = translatedDescription;
                    await propertyRepo.save(prop);
                    console.log(`Worker ${workerId}: ✅ Saved translation for: ${prop.name}`);
                } else {
                    console.log(`Worker ${workerId}: ❌ Failed to translate: ${prop.name}`);
                }

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
