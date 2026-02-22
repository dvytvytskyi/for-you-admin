const { AppDataSource } = require('../config/database');
const { Property } = require('../entities/Property');

async function checkOffPlanStatus() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        const propertyRepo = AppDataSource.getRepository(Property);

        console.log('🔍 Checking Off-Plan Properties Status...');

        const offPlanProps = await propertyRepo.find({
            where: { propertyType: 'off-plan' },
            select: ['id', 'name', 'photos']
        });

        console.log(`\nFound ${offPlanProps.length} Off-Plan properties.`);

        let onS3 = 0;
        let notOnS3 = 0;
        let hasWebP = 0;
        let totalPhotos = 0;

        for (const p of offPlanProps) {
            const photos = p.photos || [];
            totalPhotos += photos.length;

            const s3Count = photos.filter(url => url.includes('your-objectstorage.com')).length;
            const webpCount = photos.filter(url => url.toLowerCase().endsWith('.webp')).length;

            if (s3Count === photos.length && photos.length > 0) {
                onS3++;
            } else if (photos.length > 0) {
                notOnS3++;
            }

            if (webpCount > 0) { // Check if at least some are webp, or maybe check full coverage?
                // Let's count how many properties have fully converted photos
                const allWebP = photos.every(url => url.toLowerCase().endsWith('.webp'));
                if (allWebP && photos.length > 0) hasWebP++;
            }
        }

        console.log(`\n--- Status Summary ---`);
        console.log(`Total Off-Plan: ${offPlanProps.length}`);
        console.log(`Fully Migrated to S3: ${onS3}`);
        console.log(`Not/Partially Migrated: ${notOnS3}`);
        console.log(`Fully Converted to WebP: ${hasWebP}`);
        console.log(`Total Photos involved: ${totalPhotos}`);

        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkOffPlanStatus();
