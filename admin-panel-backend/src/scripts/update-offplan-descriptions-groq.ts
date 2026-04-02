import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function generateDescription(projectData: any) {
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
        model: 'llama3-70b-8192', // or any other available model
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
  } catch (error: any) {
    console.error('Groq API Error:', error.response?.data || error.message);
    return null;
  }
}

function parseResponse(content: string) {
    if (!content) return null;
    
    // Split the content into blocks. We expect BLOCK 1 and BLOCK 2.
    // The user wants:
    // Project general facts
    // Location description and benefits
    
    const block1Regex = /\[BLOCK 1\]([\s\S]*?)\[BLOCK 2\]/i;
    const block2Regex = /\[BLOCK 2\]([\s\S]*?)(?:Character count|$)/i;
    
    let block1 = block1Regex.exec(content)?.[1]?.trim();
    let block2 = block2Regex.exec(content)?.[1]?.trim();
    
    if (!block1 || !block2) {
        // Fallback: try split by headers if model didn't follow tags exactly
        const parts = content.split(/\[BLOCK \d\]/i);
        if (parts.length >= 3) {
            block1 = parts[1].trim();
            block2 = parts[2].trim();
        } else {
             // Second fallback: split in half or look for paragraph breaks
             return null; 
        }
    }

    // Remove the character counts from the blocks if they were included
    block1 = block1.split(/Character count/i)[0].trim();
    block2 = block2.split(/Character count/i)[0].trim();

    // Format as HTML
    const formattedHtml = `
<h2>Project General Facts</h2>
<p>${block1.replace(/\n\n/g, '</p><p>').replace(/\n/g, ' ')}</p>

<h2>Location Description and Benefits</h2>
<p>${block2.replace(/\n\n/g, '</p><p>').replace(/\n/g, ' ')}</p>
    `.trim();

    return formattedHtml;
}

async function run() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const propertyRepo = AppDataSource.getRepository(Property);

  console.log('Fetching properties...');
  const properties = await propertyRepo.find({
    where: { propertyType: PropertyType.OFF_PLAN },
    relations: ['developer', 'area', 'city', 'facilities'],
    order: { name: 'ASC' }
  });

  console.log(`Found ${properties.length} off-plan properties.`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    
    // Skip if already has structured description? 
    // OR just do all of them as requested. 
    // The user said "нам треба у всіх офф план проектах, змінити опиши"
    
    console.log(`[${i+1}/${properties.length}] Processing project: ${prop.name} (id: ${prop.id})`);

    const data = {
      name: prop.name,
      developerName: prop.developer?.name || 'Luxury Developer',
      areaName: prop.area?.name || 'Premium Location',
      cityName: prop.city?.name || 'UAE',
      facilities: prop.facilities?.map(f => f.name).join(', ') || 'Premium amenities',
      architecture: prop.architecture,
      interior: prop.interior,
      lobby: prop.lobby,
      priceFrom: prop.priceFrom,
      paymentPlan: prop.paymentPlan
    };

    const aiResponse = await generateDescription(data);
    if (aiResponse) {
      const formattedDescription = parseResponse(aiResponse);
      if (formattedDescription) {
        prop.description = formattedDescription;
        await propertyRepo.save(prop);
        console.log(`✅ Success for ${prop.name}`);
        successCount++;
      } else {
        console.warn(`⚠️ Failed to parse response for ${prop.name}`);
        errorCount++;
      }
    } else {
      console.error(`❌ Failed to get AI response for ${prop.name}`);
      errorCount++;
    }

    // Delay to respect rate limits (Groq can be tight)
    // 3 seconds between requests (20 RPM)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if ((i + 1) % 10 === 0) {
        console.log('--- checkpoint reached ---');
    }
  }

  console.log(`DONE. Success: ${successCount}, Errors: ${errorCount}`);
  await AppDataSource.destroy();
}

run().catch(console.error);
