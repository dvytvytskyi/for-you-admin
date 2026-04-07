
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';

async function checkTypes() {
    try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const propRepo = AppDataSource.getRepository(Property);

        const types = await propRepo.createQueryBuilder('p')
            .select('p.propertyType', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('p.propertyType')
            .getRawMany();

        console.log('\n--- Property Types in DB ---');
        console.table(types);
        
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

checkTypes();
