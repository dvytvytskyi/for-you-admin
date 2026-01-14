
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';

async function checkStatus() {
    try {
        await AppDataSource.initialize();

        const repo = AppDataSource.getRepository(Property);

        const total = await repo.count();
        const withPhotos = await repo.createQueryBuilder('p')
            .where("p.photos IS NOT NULL AND p.photos != ''")
            .getMany(); // Inefficient for huge DB but ok for few thousands

        let onHetzner = 0;
        let notOnHetzner = 0;

        withPhotos.forEach(p => {
            if (p.photos && p.photos.length > 0) {
                // Check if ANY photo is on hetzner (assuming partial migration is progress)
                // Or check if ALL. User wants migration.
                // Let's check the first photo.
                if (p.photos[0].includes('your-objectstorage.com')) {
                    onHetzner++;
                } else {
                    notOnHetzner++;
                }
            }
        });

        console.log(`\n📊 Статус міграції фото:`);
        console.log(`   Всього об'єктів з фото: ${withPhotos.length}`);
        console.log(`   ✅ Перенесено на Hetzner: ${onHetzner}`);
        console.log(`   ⏳ Залишилось: ${notOnHetzner}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkStatus();
