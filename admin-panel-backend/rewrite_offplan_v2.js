const { Client } = require('pg');
const axios = require('axios');
require('dotenv').config();

// Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// DB Configuration (change as needed)
// Assuming we are running on the server where DB is mapped to 5435
const dbConfig = {
  user: 'admin',
  host: '127.0.0.1',
  database: 'admin_panel',
  password: 'admin123', // Check if this matches your DB password
  port: 5435,
};

const client = new Client(dbConfig);

async function generateDescription(projectData) {
  const prompt = `
Role: You are a Senior Real Estate SEO Copywriter specialized in the Dubai and UAE luxury property market. Your goal is to write high-converting, informative, and search-engine-optimized project descriptions.
Task: Write two distinct content blocks for a real estate project based on the provided raw data.
General Constraints:
Language: English.
Tone: Sophisticated, expert, and inviting. Use professional real estate terminology (e.g., "high-capital appreciation," "handover," "integrated community," "curated amenities").
SEO Rules: Naturally integrate the project name and location keywords. Avoid AI-clichés like "nestled in the heart of," "unlock your dream," or "look no further."
Formatting: Use clear paragraphs. No bullet points within the main text (integrate amenities into the narrative).

BLOCK 1: Project General Facts
Specific Requirements:
Length: Strictly between 1300 and 1600 characters (including spaces).
Structure: Minimum 2, maximum 3 paragraphs.
Focus: Highlight architectural vision, harmony with nature, specific high-end amenities, interior philosophy (finishes, views, light), and the unique lifestyle experience.
Data to use:
Project Name: ${projectData.name}
Developer: ${projectData.developerName}
Architecture: ${JSON.stringify(projectData.architecture)}
Interior: ${JSON.stringify(projectData.interior)}
Lobby: ${JSON.stringify(projectData.lobby)}
Amenities: ${projectData.facilities}
Price: ${projectData.priceFrom} AED
Payment Plan: ${projectData.paymentPlan}

BLOCK 2: Location Description and Benefits
Specific Requirements:
Length: Strictly between 1300 and 1600 characters (including spaces).
Structure: Minimum 2, maximum 3 paragraphs.
Focus: Describe the island/area’s atmosphere (wildlife, serenity). Emphasize the strategic balance between secluded living and connectivity (proximity to Dubai/Sharjah). Mention sustainability and future growth potential.
Data to use:
Area: ${projectData.areaName}
City: ${projectData.cityName}

Output Format:
[BLOCK 1]
[BLOCK 2]
Provide a character count for each block at the end of the response.
`;

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    return null;
  }
}

function parseResponse(content) {
    if (!content) return null;
    
    // Split the content into blocks. We expect [BLOCK 1] and [BLOCK 2].
    const parts = content.split(/\[BLOCK \d\]/i);
    let block1 = '';
    let block2 = '';
    
    if (parts.length >= 3) {
        block1 = parts[1].trim();
        block2 = parts[2].trim();
    } else {
        // Search more carefully if split doesn't work
        const b1Match = content.match(/\[BLOCK 1\]([\s\S]*?)\[BLOCK 2\]/i);
        const b2Match = content.match(/\[BLOCK 2\]([\s\S]*?)(?:Character count|$)/i);
        if (b1Match) block1 = b1Match[1].trim();
        if (b2Match) block2 = b2Match[1].trim();
    }

    if (!block1 || !block2) return null;

    // Remove the character counts from the blocks if they were included
    block1 = block1.split(/Character count/i)[0].trim();
    block2 = block2.split(/Character count/i)[0].trim();

    // Format as HTML
    return `
<h2>Project General Facts</h2>
<p>${block1.replace(/\n\n/g, '</p><p>').replace(/\n/g, ' ')}</p>

<h2>Location Description and Benefits</h2>
<p>${block2.replace(/\n\n/g, '</p><p>').replace(/\n/g, ' ')}</p>
    `.trim();
}

async function run() {
  await client.connect();
  console.log('Connected to DB');

  // Need to join relations: developer, area, city. facilities is M:M.
  // Using direct SQL for speed and to avoid typeorm dependencies if running as standalone script
  const query = `
    SELECT p.id, p.name, p."priceFrom", p."paymentPlan", p.architecture, p.interior, p.lobby,
           d.name as "developerName",
           a.name as "areaName",
           c.name as "cityName"
    FROM properties p
    LEFT JOIN developers d ON p."developerId" = d.id
    LEFT JOIN areas a ON p."areaId" = a.id
    LEFT JOIN cities c ON p."cityId" = c.id
    WHERE p."propertyType" = 'off-plan'
    ORDER BY p.name ASC
  `;

  const { rows } = await client.query(query);
  console.log(`Found ${rows.length} properties`);

  for (let i = 0; i < rows.length; i++) {
    const prop = rows[i];
    console.log(`[${i+1}/${rows.length}] Processing: ${prop.name}`);

    // Fetch facilities (nested query for simplicity in standalone)
    const facilitiesQuery = `
      SELECT f.name FROM facilities f
      JOIN properties_facilities_facilities pff ON f.id = pff."facilitiesId"
      WHERE pff."propertiesId" = $1
    `;
    const { rows: facilities } = await client.query(facilitiesQuery, [prop.id]);
    const facilityNames = facilities.map(f => f.name).join(', ');

    const data = {
      ...prop,
      facilities: facilityNames || 'High-end amenities'
    };

    const aiResponse = await generateDescription(data);
    if (aiResponse) {
      const formatted = parseResponse(aiResponse);
      if (formatted) {
        await client.query('UPDATE properties SET description = $1 WHERE id = $2', [formatted, prop.id]);
        console.log(`✅ ${prop.name} updated.`);
      } else {
        console.warn(`⚠️ Failed to parse: ${prop.name}`);
      }
    } else {
      console.error(`❌ Failed AI for: ${prop.name}`);
    }

    // Rate limit delay
    await new Promise(r => setTimeout(r, 2500));
  }

  await client.end();
  console.log('Script finished');
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
