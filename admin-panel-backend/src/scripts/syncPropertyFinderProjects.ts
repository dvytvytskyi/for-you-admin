import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { PropertyFinderService } from '../services/property-finder.service';

async function sync() {
    try {
        console.log('--- Property Finder Project Sync ---');
        console.log('Initializing database...');
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const service = new PropertyFinderService();
        console.log('Starting sync...');
        const result = await service.syncAllProjects();
        
        console.log('--- Sync Completed ---');
        console.log(`Synced: ${result.synced}`);
        console.log(`Failed: ${result.failed}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Fatal sync error:', error);
        process.exit(1);
    }
}

sync();
