const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { AppDataSource } = require('../config/database');
const { Property } = require('../entities/Property');

// --- CONFIGURATION & ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');

if (help) {
    console.log(`
    Run Off-Plan Migration
    `);
    process.exit(0);
}

const BUCKET_NAME = 'foryou';
const S3_ENDPOINT = 'https://nbg1.your-objectstorage.com';
const S3_REGION = 'nbg1';
const CHECKPOINT_FILE = path.join(__dirname, `.migration_offplan_checkpoint`);

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
        timeout: 10000 // 10s timeout
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

async function processAndUploadPhoto(propertyId, url) {
    try {
        const imageBuffer = await downloadImage(url);
        const uniqueId = uuidv4();

        // Process Full & Small in parallel
        const [fullBuffer, smallBuffer] = await Promise.all([
            sharp(imageBuffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer(),
            sharp(imageBuffer).resize(800, null, { withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
        ]);

        const fullKey = `properties/${propertyId}/${uniqueId}_full.jpg`;
        const smallKey = `properties/${propertyId}/${uniqueId}_small.jpg`;

        const [fullUrl, smallUrl] = await Promise.all([
            uploadToS3(fullKey, fullBuffer, 'image/jpeg'),
            uploadToS3(smallKey, smallBuffer, 'image/jpeg')
        ]);

        return { full: fullUrl, small: smallUrl };
    } catch (error) {
        // console.error(`Failed to upload ${url}`, error.message);
        return null;
    }
}

async function pMap(collection, handler, concurrency) {
    const results = new Array(collection.length);
    const generators = collection.entries();
    const workers = Array(Math.min(concurrency, collection.length)).fill(null).map(async () => {
        for (const [index, item] of generators) {
            try {
                results[index] = await handler(item, index);
            } catch (err) { }
        }
    });
    await Promise.all(workers);
    return results;
}

async function migratePhotos() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log(`DB_CONNECTED`);

        const propertyRepo = AppDataSource.getRepository(Property);
        const BATCH_SIZE = 20;

        let lastProcessedId = null;
        if (fs.existsSync(CHECKPOINT_FILE)) {
            lastProcessedId = fs.readFileSync(CHECKPOINT_FILE, 'utf-8').trim();
            console.log(`RESUMING:${lastProcessedId}`);
        }

        while (true) {
            // Build Query
            const queryBuilder = propertyRepo.createQueryBuilder('property')
                .select(['property.id', 'property.name', 'property.photos', 'property.propertyType'])
                .where("property.propertyType = 'off-plan'")
                .orderBy('property.id', 'ASC')
                .take(BATCH_SIZE);

            if (lastProcessedId) {
                queryBuilder.andWhere('property.id > :lastId', { lastId: lastProcessedId });
            }

            const properties = await queryBuilder.getMany();

            if (properties.length === 0) {
                console.log('DONE');
                break;
            }

            console.log(`HEARTBEAT:${properties.length}`);

            await pMap(properties, async (property) => {
                const photos = property.photos || [];
                const needsMigration = photos.some(p => !p.includes('your-objectstorage.com'));

                if (!needsMigration) return;

                let hasChanges = false;

                const processedResults = await pMap(photos, async (photoUrl) => {
                    if (photoUrl.includes('your-objectstorage.com')) return photoUrl;

                    const result = await processAndUploadPhoto(property.id, photoUrl);
                    if (result) {
                        hasChanges = true;
                        return result.small;
                    }
                    return photoUrl;
                }, 4);

                if (hasChanges) {
                    const newPhotos = processedResults.filter(p => !!p);
                    await propertyRepo.update(property.id, { photos: newPhotos });
                    console.log(`PROGRESS:1 :: ${property.name}`);
                }
            }, 5);

            if (properties.length > 0) {
                lastProcessedId = properties[properties.length - 1].id;
                fs.writeFileSync(CHECKPOINT_FILE, lastProcessedId);
            }

            if (global.gc) { global.gc(); }
        }

        if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);

        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error(`ERROR:${error.message}`);
        process.exit(1);
    }
}

migratePhotos();
