import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { PropertyFinderService } from '../services/property-finder.service';

async function main() {
    try {
        console.log('--- STARTING PROPERTY FINDER ENRICHED SYNC ---');
        
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connected');
        }

        const pfService = new PropertyFinderService();
        console.log('Calling syncAllProjects(). This will take some time due to location enrichment...');
        
        const result = await pfService.syncAllProjects();
        
        console.log('--- SYNC COMPLETED ---');
        console.log('Result:', JSON.stringify(result, null, 2));
        
    } catch (error: any) {
        console.error('CRITICAL ERROR:', error.message, error.stack);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(0);
    }
}

main();
