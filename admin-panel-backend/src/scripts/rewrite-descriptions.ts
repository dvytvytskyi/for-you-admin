import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import axios from 'axios';
import * as fs from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// System prompt to define the rewrite rules and request HTML + JSON output
const SYSTEM_PROMPT = `You are an expert real estate copywriter and SEO specialist for "For You Real Estate" agency in Dubai.
Your task is to take a property description provided by another broker and rewrite it into a premium, highly-converting, SEO-optimized text.

CRITICAL RULES:
1. REMOVE ALL external contact information: other agents' names, phone numbers, emails, WhatsApp links, broker names, license numbers (ORN/BRN/DED/RERA), and websites.
2. Structure the text with pure HTML tags (e.g., <h1>, <p>, <ul>, <li>, <strong>). DO NOT use markdown like ** or #.
3. Structure:
   - <h1>Clear, catchy Title</h1>
   - <p>An engaging 2-3 sentence introduction paragraph highlighting key selling points.</p>
   - <h2>Property Details:</h2><ul><li>...</li></ul> (Bedrooms, Bathrooms, Furnished, Size, Balcony, etc.)
   - <h2>Amenities:</h2><ul><li>...</li></ul> (Pool, Gym, Security, etc.)
   - <h2>Location Highlights:</h2><ul><li>...</li></ul>
   - <p><strong>Contact Us:</strong> Contact For You Real Estate today to arrange a viewing and secure this exceptional property.</p>
4. The output must be valid JSON containing two keys: "en" (for English description HTML) and "ru" (for professional Russian translation HTML of the exact same rewritten description).
5. Be concise and professional.

Return ONLY valid JSON. Example:
{
  "en": "<h1>...</h1><p>...</p>",
  "ru": "<h1>...</h1><p>...</p>"
}`;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

async function rewriteDescription(originalDescription: string, propertyName: string, buildingName: string): Promise<{en: string, ru: string} | null> {
  const content = `Property Name/Title: ${propertyName}\nBuilding/Community: ${buildingName || 'Unknown'}\n\nOriginal Description to rewrite:\n${originalDescription}`;

  let retries = 3;
  while (retries > 0) {
    try {
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content }
          ],
          temperature: 0.5,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const jsonStr = response.data.choices[0].message.content.trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.en && parsed.ru) {
        return parsed;
      } else {
         return null;
      }
    } catch (error: any) {
      if (error.response?.status === 429) {
        // Rate limit
        await sleep(5000);
      } else {
        console.error('❌ Groq API Error:', error.response?.data || error.message);
      }
      retries--;
      await sleep(2000);
    }
  }
  return null;
}

async function run() {
  try {
    console.log('🔄 Підключення до бази даних...');
    await AppDataSource.initialize();
    console.log('✅ База підключена');

    const propertyRepo = AppDataSource.getRepository(Property);

    // Завантажуємо Secondary об'єкти, які ще не були переформатовані в HTML
    console.log('📖 Завантаження властивостей для обробки...');
    
    // Щоб скрипт можна було зупинити і продовжити,
    // ми шукаємо тільки ті описи, де ще немає нашого тегу "<h1>" або "Contact For You"
    const properties = await propertyRepo.createQueryBuilder('property')
      .where('property.propertyType = :type', { type: PropertyType.SECONDARY })
      .andWhere('property.description IS NOT NULL')
      .andWhere("property.description != ''")
      .andWhere("property.description NOT LIKE '%Contact For You Real Estate%'")
      .andWhere("property.description NOT LIKE '%<h1%'")
      .orderBy('property.createdAt', 'DESC')
      .getMany();

    console.log(`📊 Знайдено ${properties.length} об'єктів для форматування.`);

    let processed = 0;
    let saved = 0;
    let errors = 0;

    for (const property of properties) {
      processed++;
      process.stdout.write(`\r⏳ Обробка ${processed}/${properties.length} [ID: ${property.id}]... `);
      
      const rewritten = await rewriteDescription(property.description || '', property.name || '', property.buildingName || '');
      
      if (rewritten && rewritten.en && rewritten.ru) {
        property.description = rewritten.en;
        property.descriptionRu = rewritten.ru;
        
        await propertyRepo.save(property);
        saved++;
      } else {
        errors++;
      }
      
      // Затримка між запитами, щоб не перевищити безкоштовні ліміти Groq
      // Безкоштовний ліміт - зазвичай близько 30 запитів на хвилину
      await sleep(2000); 
    }

    console.log('\n\n✅ Переформатування завершено!');
    console.log(`   📝 Оброблено: ${processed}`);
    console.log(`   💾 Збережено: ${saved}`);
    console.log(`   ❌ Помилок: ${errors}`);

  } catch (e) {
    console.error('Критична помилка:', e);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

run();
