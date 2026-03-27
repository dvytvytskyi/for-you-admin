import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';

function generateSlug(title: string): string {
    if (!title) return '';
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

async function fixDevelopers() {
    try {
        await AppDataSource.initialize();
        console.log('Database initialized');

        const developerRepo = AppDataSource.getRepository(Developer);
        const developers = await developerRepo.find();

        console.log(`Found ${developers.length} developers`);

        for (const dev of developers) {
            let updated = false;

            if (!dev.slug) {
                dev.slug = generateSlug(dev.name);
                updated = true;
            }

            if (!dev.previewImage && dev.images && dev.images.length > 0) {
                dev.previewImage = dev.images[0];
                updated = true;
            }

            if (updated) {
                console.log(`Updating developer: ${dev.name} (slug: ${dev.slug})`);
                await developerRepo.save(dev);
            }
        }

        console.log('Done fixing developers');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing developers:', error);
        process.exit(1);
    }
}

fixDevelopers();
