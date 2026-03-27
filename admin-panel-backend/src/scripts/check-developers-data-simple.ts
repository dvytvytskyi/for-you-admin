import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Developer } from '../entities/Developer';

async function checkDevelopersData() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected\n');

        const developers = await AppDataSource.getRepository(Developer).find({
            take: 10
        });

        console.log('Sample Data for 10 Developers:');
        developers.forEach(d => {
            console.log(`Developer: ${d.name}`);
            console.log(`  logo: ${d.logo ? (d.logo.length > 50 ? d.logo.substring(0, 50) + '...' : d.logo) : 'EMPTY'}`);
            console.log(`  previewImage: ${d.previewImage ? (d.previewImage.length > 50 ? d.previewImage.substring(0, 50) + '...' : d.previewImage) : 'EMPTY'}`);
            console.log(`  images count: ${d.images ? d.images.length : 0}`);
            console.log(`  description (En): ${d.description ? (d.description.length > 50 ? d.description.substring(0, 50) + '...' : d.description) : 'EMPTY'}`);
            console.log(`  descriptionRu: ${d.descriptionRu ? (d.descriptionRu.length > 50 ? d.descriptionRu.substring(0, 50) + '...' : d.descriptionRu) : 'EMPTY'}`);
            console.log('---');
        });

        await AppDataSource.destroy();
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkDevelopersData();
