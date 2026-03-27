const axios = require('axios');
const { Client } = require('pg');

const apiKey = process.env.GROQ_API_KEY || '';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are an expert real estate copywriter.
Return ONLY a valid JSON object with exactly two keys: "en" and "ru".
"en" should be a premium HTML description in English.
"ru" should be a professional HTML translation in Russian.
Structure: <h1>{Name}</h1>...<h2>Property Features</h2><ul>...</ul>...
DO NOT return any text outside the JSON.`;

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function rewriteDescription(content, name, buildingName, keyIndex) {
    let retries = 3;
    const apiKey = process.env.GROQ_API_KEY || '';

    while (retries > 0) {
        try {
            const response = await axios.post(
                GROQ_API_URL,
                {
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: `Name: ${name}\nBuilding: ${buildingName}\nDescription: ${content}` }
                    ],
                    temperature: 0.5
                },
                {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    timeout: 45000 
                }
            );

            let jsonStr = response.data.choices[0].message.content.trim();
            // Try to extract JSON if it's wrapped in backticks
            if (jsonStr.includes('```json')) {
                jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
            } else if (jsonStr.includes('```')) {
                jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
            }

            const parsed = JSON.parse(jsonStr);
            const en = parsed.en || parsed.English;
            const ru = parsed.ru || parsed.Russian;
            
            if (en && ru) return { en, ru };
            process.stdout.write(`    ⚠️  [Key ${keyIndex % API_KEYS.length}] Invalid JSON format.\n`);
        } catch (error) {
            if (error.response?.status === 429) {
                process.stdout.write(`    ⏳  [Key ${keyIndex % API_KEYS.length} - 429] Waiting 10s...\n`);
                await sleep(10000);
            } else {
                const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
                process.stdout.write(`    ❌  [Key ${keyIndex % API_KEYS.length} Error]: ${detail}\n`);
            }
        }
        retries--;
        await sleep(2000);
    }
    return null;
}

async function run() {
    const dbClient = new Client({ user: 'admin', host: '127.0.0.1', database: 'admin_panel', password: 'admin123', port: 5435 });
    await dbClient.connect();
    process.stdout.write('✅ БД підключена!\n');

    const res = await dbClient.query(`
        SELECT id, name, description, buildingname 
        FROM properties 
        WHERE "propertyType" = 'secondary' 
        AND description IS NOT NULL 
        AND description != ''
        AND description NOT LIKE '%<h1>%'
        ORDER BY "createdAt" DESC
    `);
    
    const properties = res.rows;
    process.stdout.write(`📊 Знайдено ${properties.length} об'єктів для форматування.\n`);

    const CONCURRENCY = 5;
    let nextIdx = 0;

    const workers = Array.from({ length: CONCURRENCY }).map(async (_, keyIdx) => {
        while (nextIdx < properties.length) {
            const i = nextIdx++;
            const property = properties[i];
            if (!property) break;

            try {
                process.stdout.write(`⏳ [${i+1}/${properties.length}] Worker ${keyIdx} processing ${property.id}\n`);
                const result = await rewriteDescription(property.description, property.name, property.buildingname, keyIdx);
                if (result) {
                    await dbClient.query(
                        `UPDATE properties SET description = $1, "descriptionRu" = $2 WHERE id = $3`,
                        [result.en, result.ru, property.id]
                    );
                    process.stdout.write(`  ✅ [${property.id}] DONE!\n`);
                }
            } catch (err) {
                process.stdout.write(`  ❌ [${property.id}] Error: ${err.message}\n`);
            }
            await sleep(5000); // Super safe delay to avoid 429 across all keys
        }
    });

    await Promise.all(workers);
    process.stdout.write('\n\n✅ Всього завершено!\n');
    await dbClient.end();
}

run().catch(err => {
    process.stdout.write(`\n\n❌ КРИТИЧНА ПОМИЛКА: ${err.message}\n`);
    process.exit(1);
});
