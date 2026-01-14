import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';

async function checkAreas() {
    try {
        await AppDataSource.initialize();
        const repo = AppDataSource.getRepository(Area);
        // DISTINCT check if any description exists
        const withDesc = await repo.createQueryBuilder("area")
            .where("area.description IS NOT NULL")
            .getMany();

        console.log(`Areas with description: ${withDesc.length}`);
        if (withDesc.length > 0) {
            console.log("Sample:", JSON.stringify(withDesc[0], null, 2));
        } else {
            console.log("No areas have descriptions.");
            // Maybe we should translate from some other source? Or maybe names?
            // User said "translate descriptions". Maybe they exist in another form?
            // Or maybe they WANT to add descriptions?
            // "translate all descriptions... and make two versions"
            // If they don't exist, I cannot translate.
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkAreas();
