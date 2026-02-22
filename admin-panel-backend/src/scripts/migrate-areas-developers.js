const { AppDataSource } = require('../config/database');
const { Area } = require('../entities/Area');
const { Developer } = require('../entities/Developer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const BUCKET_NAME = 'foryou';
const S3_ENDPOINT = 'https://nbg1.your-objectstorage.com';
const S3_REGION = 'nbg1';

// Hetzner Credentials
const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
        accessKeyId: 'NO4DMOF39TSO56UNYT0O',
        secretAccessKey: 'vmWltjsWNRcIFCUkz5HI51RQw0q21uSs9qB9cUkW',
    },
    forcePathStyle: true,
});

async function downloadImage(url) {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000
    });
    return Buffer.from(response.data, 'binary');
}

async function uploadToS3(key, body, contentType) {
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
    }));
    return `${S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

async function processAndUploadImage(folder, entityId, url, compress = true) {
    try {
        if (url.includes('your-objectstorage.com')) return url;

        const imageBuffer = await downloadImage(url);
        const uniqueId = uuidv4();
        const extension = url.split('.').pop().split('?')[0] || 'jpg';
        const isPng = extension.toLowerCase() === 'png';

        let processedBuffer;
        let contentType;
        let key;

        if (compress) {
            processedBuffer = await sharp(imageBuffer)
                .resize(1200, null, { withoutEnlargement: true })
                .jpeg({ quality: 80, mozjpeg: true })
                .toBuffer();
            contentType = 'image/jpeg';
            key = `${folder}/${entityId}/${uniqueId}.jpg`;
        } else {
            processedBuffer = imageBuffer;
            contentType = isPng ? 'image/png' : 'image/jpeg';
            key = `${folder}/${entityId}/${uniqueId}.${extension}`;
        }

        return await uploadToS3(key, processedBuffer, contentType);
    } catch (error) {
        console.error(`   Failed to process image ${url}: ${error.message}`);
        return null;
    }
}

async function migrateAll() {
    try {
        await AppDataSource.initialize();
        console.log(`🚀 DB Connected. Starting migration...`);

        const areaRepo = AppDataSource.getRepository(Area);
        const developerRepo = AppDataSource.getRepository(Developer);

        // 1. MIGRATE AREAS
        console.log(`\n--- Migrating Areas ---`);
        const areas = await areaRepo.find();
        for (const area of areas) {
            const images = area.images || [];
            const needsMigration = images.some(img => !img.includes('your-objectstorage.com'));

            if (!needsMigration) continue;

            console.log(`📦 Area "${area.nameEn}" - Migrating ${images.length} images...`);
            const newImages = [];
            for (const imgUrl of images) {
                const newUrl = await processAndUploadImage('areas', area.id, imgUrl, true);
                if (newUrl) newImages.push(newUrl);
                else newImages.push(imgUrl);
            }

            await areaRepo.update(area.id, { images: newImages });
        }

        // 2. MIGRATE DEVELOPERS
        console.log(`\n--- Migrating Developers ---`);
        const developers = await developerRepo.find();
        for (const dev of developers) {
            let hasChanges = false;
            let updatedLogo = dev.logo;
            let updatedImages = dev.images || [];

            if (dev.logo && !dev.logo.includes('your-objectstorage.com')) {
                console.log(`🏢 Dev "${dev.name}" - Migrating logo...`);
                const newLogo = await processAndUploadImage('developers/logos', dev.id, dev.logo, false);
                if (newLogo) {
                    updatedLogo = newLogo;
                    hasChanges = true;
                }
            }

            const imagesNeedsMigration = updatedImages.some(img => !img.includes('your-objectstorage.com'));
            if (imagesNeedsMigration) {
                console.log(`🏢 Dev "${dev.name}" - Migrating images...`);
                const processedImages = [];
                for (const imgUrl of updatedImages) {
                    const newUrl = await processAndUploadImage('developers/photos', dev.id, imgUrl, true);
                    if (newUrl) processedImages.push(newUrl);
                    else processedImages.push(imgUrl);
                }
                updatedImages = processedImages;
                hasChanges = true;
            }

            if (hasChanges) {
                await developerRepo.update(dev.id, { logo: updatedLogo, images: updatedImages });
            }
        }

        console.log(`\n✨ Migration complete!`);
        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error(`❌ Migration Error: ${error.message}`);
        process.exit(1);
    }
}

migrateAll();
