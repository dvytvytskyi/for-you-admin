
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';
import * as dotenv from 'dotenv';
import 'reflect-metadata';

// Load environment variables
dotenv.config();

const phrasesToRemove = [
    "##### Project general facts",
    "##### Kitchen and appliances",
    "##### Furnishing",
    "##### Location description and benefits"
];

async function cleanupDescriptions() {
    try {
        console.log('Connecting to database...');
        await AppDataSource.initialize();
        console.log('Database connected.');

        const propertyRepo = AppDataSource.getRepository(Property);

        // Fetch all properties that might contain these phrases
        // We'll filter in memory for simplicity ensuring we catch all
        console.log('Fetching properties...');
        const properties = await propertyRepo.find();
        console.log(`Found ${properties.length} properties. Checking for phrases to remove...`);

        let updatedCount = 0;
        const updates: Property[] = [];

        for (const prop of properties) {
            if (!prop.description) continue;

            let newDesc = prop.description;
            let modified = false;

            for (const phrase of phrasesToRemove) {
                if (newDesc.includes(phrase)) {
                    // Replace globally
                    newDesc = newDesc.split(phrase).join('');
                    modified = true;
                }
            }

            if (modified) {
                prop.description = newDesc.trim(); // Basic trim
                updates.push(prop);
                updatedCount++;
            }
        }

        if (updates.length > 0) {
            console.log(`Saving ${updates.length} updated properties...`);
            // Save in batches of 50 to avoid huge query
            const batchSize = 50;
            for (let i = 0; i < updates.length; i += batchSize) {
                const batch = updates.slice(i, i + batchSize);
                await propertyRepo.save(batch);
                console.log(`Saved batch ${i / batchSize + 1}/${Math.ceil(updates.length / batchSize)}`);
            }
        }

        console.log(`Cleanup complete. Modified ${updatedCount} properties.`);
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanupDescriptions();
