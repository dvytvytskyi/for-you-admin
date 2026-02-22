import { AppDataSource } from '../config/database';
import { Vacancy } from '../entities/Vacancy';

async function debug() {
    try {
        console.log('Connecting to database...');
        await AppDataSource.initialize();
        console.log('Connected!');

        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        console.log('Fetching all vacancies...');
        const vacancies = await vacancyRepo.find();
        console.log(`Found ${vacancies.length} vacancies.`);

        if (vacancies.length > 0) {
            console.log('First vacancy:', JSON.stringify(vacancies[0], null, 2));
        }

        const metadata = AppDataSource.getMetadata(Vacancy);
        console.log('Table name:', metadata.tableName);
        console.log('Columns:', metadata.columns.map(c => c.propertyName));

    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

debug();
