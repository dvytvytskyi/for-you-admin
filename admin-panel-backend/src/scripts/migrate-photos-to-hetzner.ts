import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Property } from '../entities/Property';
import { entities } from '../entities';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION & ARGS ---
const args = process.argv.slice(2);
const help = args.includes('--help');

if (help) {
    console.log(`
    \x1b[36mUsage:\x1b[0m ts-node src/scripts/migrate-photos-to-hetzner.ts [options]
    
    \x1b[33mOptions:\x1b[0m
      --prefixes="0123"    Hex characters to filter by (Sharding).
      --name="worker1"     Unique name for checkpoint file.
    `);
    process.exit(0);
}

const prefixesArg = args.find(a => a.startsWith('--prefixes='))?.split('=')[1] || '';
const workerName = args.find(a => a.startsWith('--name='))?.split('=')[1] || 'default';
const PREFIXES = prefixesArg ? prefixesArg.split('') : [];

const BUCKET_NAME = 'foryou';
const S3_ENDPOINT = 'https://nbg1.your-objectstorage.com';
const S3_REGION = 'nbg1';
const CHECKPOINT_FILE = path.join(__dirname, `.migration_checkpoint_${workerName}`);

// Log Startup
console.log(`\x1b[32m🚀 Starting Worker: ${workerName}\x1b[0m`);
if (PREFIXES.length > 0) {
    console.log(`   🔍 Shard Filter: UUIDs starting with [${PREFIXES.join(', ')}]`);
} else {
    console.log(`   🔍 Processing ALL UUIDs (No sharding)`);
}

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

// DB CONNECTION SETTINGS
const DB_HOST = 'localhost';
const DB_PORT = 5434;
const DB_USER = 'admin';
const DB_PASS = 'admin123';
const DB_NAME = 'admin_panel';

async function downloadImage(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000 // 10s timeout
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

async function processAndUploadPhoto(propertyId: string, url: string): Promise<{ full: string, small: string } | null> {
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
        return null; // Fail silently, let supervisor handle retries/progress
    }
}

// Simple concurrency helper
async function pMap<T, R>(
    collection: T[],
    handler: (item: T, index: number) => Promise<R>,
    concurrency: number
): Promise<R[]> {
    const results: R[] = new Array(collection.length);
    const generators = collection.entries();

    const worker = async () => {
        for (const [index, item] of generators) {
            try {
                results[index] = await handler(item, index);
            } catch (err) {
                // Ignore individual item failures
            }
        }
    };

    const workers = Array(Math.min(concurrency, collection.length))
        .fill(null)
        .map(worker);

    await Promise.all(workers);
    return results;
}

async function migratePhotos() {
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
        // Console log strictly formatted for supervisor
        console.log(`DB_CONNECTED`);

        const propertyRepo = dataSource.getRepository(Property);
        const BATCH_SIZE = 20;

        let lastProcessedId: string | null = null;
        if (fs.existsSync(CHECKPOINT_FILE)) {
            lastProcessedId = fs.readFileSync(CHECKPOINT_FILE, 'utf-8').trim();
            console.log(`RESUMING:${lastProcessedId}`);
        }

        let processedCount = 0;

        while (true) {
            // Build Query
            const queryBuilder = propertyRepo.createQueryBuilder('property')
                .select(['property.id', 'property.name', 'property.photos'])
                .orderBy('property.id', 'ASC')
                .take(BATCH_SIZE);

            if (lastProcessedId) {
                queryBuilder.andWhere('property.id > :lastId', { lastId: lastProcessedId });
            }

            if (PREFIXES.length > 0) {
                // Regex anchor ^ to match start
                const regexPattern = `^([${PREFIXES.join('')}])`;
                queryBuilder.andWhere('property.id::text ~ :regex', { regex: regexPattern });
            }

            const properties = await queryBuilder.getMany();

            if (properties.length === 0) {
                console.log('DONE');
                break;
            }

            console.log(`HEARTBEAT:${properties.length}`); // Signal alive

            // Process properties in parallel
            await pMap(properties, async (property) => {
                const photos = property.photos || [];
                const needsMigration = photos.some(p => !p.includes('your-objectstorage.com'));

                if (!needsMigration) return;

                let hasChanges = false;

                // Process photos
                const processedResults = await pMap(photos, async (photoUrl) => {
                    if (photoUrl.includes('your-objectstorage.com')) return photoUrl;

                    const result = await processAndUploadPhoto(property.id, photoUrl);
                    if (result) {
                        hasChanges = true;
                        return result.small; // Use small image for listing/speed as before
                    }
                    return photoUrl;
                }, 4); // 4 concurrent photo uploads

                if (hasChanges) {
                    const newPhotos = processedResults.filter(p => !!p);
                    await propertyRepo.update(property.id, { photos: newPhotos });
                    console.log(`PROGRESS:1`); // 1 property updated
                }
            }, 5); // 5 concurrent properties

            if (properties.length > 0) {
                lastProcessedId = properties[properties.length - 1].id;
                fs.writeFileSync(CHECKPOINT_FILE, lastProcessedId);
                processedCount += properties.length;
            }

            // Explicitly call GC if available to prevent leak over long run
            if (global.gc) { global.gc(); }
        }

        if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);

        await dataSource.destroy();
        process.exit(0);
    } catch (error: any) {
        console.error(`ERROR:${error.message}`);
        process.exit(1);
    }
}

migratePhotos();
