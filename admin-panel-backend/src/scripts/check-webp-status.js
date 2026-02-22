const { AppDataSource } = require('../config/database');
const { Property } = require('../entities/Property');

async function checkWebPStatus() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        const propertyRepo = AppDataSource.getRepository(Property);

        console.log('🔍 Checking WebP Conversion Status (Off-Plan)...');

        const offPlanProps = await propertyRepo.find({
            where: { propertyType: 'off-plan' },
            select: ['id', 'name', 'photos']
        });

        let totalPhotos = 0;
        let webpPhotos = 0;
        let s3Photos = 0;
        let fullyConvertedCount = 0;

        for (const p of offPlanProps) {
            const photos = p.photos || [];
            totalPhotos += photos.length;

            const pS3Count = photos.filter(url => url.includes('your-objectstorage.com')).length;
            const pWebpCount = photos.filter(url => url.toLowerCase().endsWith('.webp')).length;

            s3Photos += pS3Count;
            webpPhotos += pWebpCount;

            if (pWebpCount === photos.length && photos.length > 0) {
                fullyConvertedCount++;
            }
        }

        console.log(`\n--- Off-Plan Status ---`);
        console.log(`Total Off-Plan Properties: ${offPlanProps.length}`);
        console.log(`Fully WebP Properties: ${fullyConvertedCount}`);
        console.log(`Total Off-Plan Photos: ${totalPhotos}`);
        console.log(`Photos on S3: ${s3Photos} (${((s3Photos / totalPhotos) * 100).toFixed(2)}%)`);
        console.log(`Photos in WebP: ${webpPhotos} (${((webpPhotos / totalPhotos) * 100).toFixed(2)}%)`);

        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkWebPStatus();
