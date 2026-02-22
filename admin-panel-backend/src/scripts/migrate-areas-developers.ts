import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Area } from '../entities/Area';
import { Developer } from '../entities/Developer';
import { entities } from '../entities';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

// DB CONNECTION SETTINGS (matches connect-to-db.sh)
const DB_HOST = 'localhost';
const DB_PORT = 5434;
const DB_USER = 'admin';
const DB_PASS = 'admin123';
const DB_NAME = 'admin_panel';

async function downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000 // 15s timeout
    });
    return Buffer.from(response.data, 'binary');
}

async function uploadToS3(key: string, body: Buffer, contentType: string) {
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
    }));
    return `${S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

async function processAndUploadImage(folder: string, entityId: string, url: string, compress: boolean = true): Promise<string | null> {
    try {
        if (url.includes('your-objectstorage.com')) return url;

        const imageBuffer = await downloadImage(url);
        const uniqueId = uuidv4();
        const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
        const isPng = extension.toLowerCase() === 'png';

        let processedBuffer: Buffer;
        let contentType: string;
        let key: string;

        if (compress) {
            // Compress for fast loading
            processedBuffer = await sharp(imageBuffer)
                .resize(1200, null, { withoutEnlargement: true }) // Max width 1200px
                .jpeg({ quality: 80, mozjpeg: true })
                .toBuffer();
            contentType = 'image/jpeg';
            key = `${folder}/${entityId}/${uniqueId}.jpg`;
        } else {
            // No compression (for logos)
            processedBuffer = imageBuffer;
            contentType = isPng ? 'image/png' : 'image/jpeg';
            key = `${folder}/${entityId}/${uniqueId}.${extension}`;
        }

        return await uploadToS3(key, processedBuffer, contentType);
    } catch (error: any) {
        console.error(`   Failed to process image ${url}: ${error.message}`);
        return null;
    }
}

async function migrateAll() {
    try {
        const dataSource = new DataSource({
            type: 'postgres',
            host: DB_HOST,
            port: DB_PORT,
            username: DB_USER,
            password: DB_PASS,
            database: DB_NAME,
            entities: entities,
            synchronize: false,
            logging: false,
        });

        await dataSource.initialize();
        console.log(`\x1b[32m🚀 DB Connected. Starting migration of Areas and Developers...\x1b[0m`);

        const areaRepo = dataSource.getRepository(Area);
        const developerRepo = dataSource.getRepository(Developer);

        // 1. MIGRATE AREAS
        console.log(`\n\x1b[36m--- Migrating Areas ---\x1b[0m`);
        const areas = await areaRepo.find();
        console.log(`Found ${areas.length} areas.`);

        for (const area of areas) {
            const images = area.images || [];
            const needsMigration = images.some(img => !img.includes('your-objectstorage.com'));

            if (!needsMigration) {
                console.log(`✅ Area "${area.nameEn}" - Already migrated.`);
                continue;
            }

            console.log(`📦 Area "${area.nameEn}" - Migrating ${images.length} images...`);
            const newImages: string[] = [];
            for (const imgUrl of images) {
                const newUrl = await processAndUploadImage('areas', area.id, imgUrl, true);
                if (newUrl) newImages.push(newUrl);
                else newImages.push(imgUrl); // Fallback to old URL if failed
            }

            await areaRepo.update(area.id, { images: newImages });
            console.log(`   Done.`);
        }

        // 2. MIGRATE DEVELOPERS
        console.log(`\n\x1b[36m--- Migrating Developers ---\x1b[0m`);
        const developers = await developerRepo.find();
        console.log(`Found ${developers.length} developers.`);

        for (const dev of developers) {
            let hasChanges = false;
            let updatedLogo = dev.logo;
            let updatedImages = dev.images || [];

            // Migrate Logo (No compression)
            if (dev.logo && !dev.logo.includes('your-objectstorage.com')) {
                console.log(`🏢 Dev "${dev.name}" - Migrating logo...`);
                const newLogo = await processAndUploadImage('developers/logos', dev.id, dev.logo, false);
                if (newLogo) {
                    updatedLogo = newLogo;
                    hasChanges = true;
                }
            }

            // Migrate Images (Compression)
            const imagesNeedsMigration = updatedImages.some(img => !img.includes('your-objectstorage.com'));
            if (imagesNeedsMigration) {
                console.log(`🏢 Dev "${dev.name}" - Migrating ${updatedImages.length} images...`);
                const processedImages: string[] = [];
                for (const imgUrl of updatedImages) {
                    const newUrl = await processAndUploadImage('developers/photos', dev.id, imgUrl, true);
                    if (newUrl) processedImages.push(newUrl);
                    else processedImages.push(imgUrl);
                }
                updatedImages = processedImages;
                hasChanges = true;
            }

            if (hasChanges) {
                await developerRepo.update(dev.id, {
                    logo: updatedLogo,
                    images: updatedImages
                });
                console.log(`   Done.`);
            } else {
                console.log(`✅ Dev "${dev.name}" - Already migrated.`);
            }
        }

        console.log(`\n\x1b[32m✨ Migration complete!\x1b[0m`);
        await dataSource.destroy();
        process.exit(0);
    } catch (error: any) {
        console.error(`\x1b[31m❌ Migration Error: ${error.message}\x1b[0m`);
        process.exit(1);
    }
}

migrateAll();
