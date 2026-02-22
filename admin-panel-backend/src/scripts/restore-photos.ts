
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Property } from '../entities/Property';
import { Area } from '../entities/Area';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { AppDataSource } from '../config/database';

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

async function restorePhotos() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log(`DB_CONNECTED`);

        // --- 1. Restore Properties ---
        const propertyRepo = AppDataSource.getRepository(Property);
        const properties = await propertyRepo.find({
            select: ['id', 'photos']
        });
        console.log(`Found ${properties.length} properties to scan.`);

        let restoredProps = 0;
        let skippedProps = 0;

        const processProperty = async (prop: Property) => {
            if (prop.photos && prop.photos.length > 0) {
                skippedProps++;
                return;
            }

            const prefix = `properties/${prop.id}/`;
            try {
                const command = new ListObjectsV2Command({
                    Bucket: BUCKET_NAME,
                    Prefix: prefix
                });

                const response = await s3Client.send(command);

                if (response.Contents && response.Contents.length > 0) {
                    const files = response.Contents.map(c => c.Key!);

                    let targetFiles = files.filter(k => k.endsWith('_small.webp'));
                    if (targetFiles.length === 0) {
                        targetFiles = files.filter(k => k.endsWith('_small.jpg'));
                    }
                    if (targetFiles.length === 0) {
                        targetFiles = files.filter(k => k.endsWith('.jpg') || k.endsWith('.webp') || k.endsWith('.png'));
                    }

                    if (targetFiles.length > 0) {
                        const urls = targetFiles.map(key => `${S3_ENDPOINT}/${BUCKET_NAME}/${key}`);
                        await propertyRepo.update(prop.id, { photos: urls });
                        restoredProps++;
                        process.stdout.write('.');
                    }
                }
            } catch (err) {
                // console.error(`Error scanning property ${prop.id}:`, err);
            }
        };

        const BATCH_SIZE = 50;
        for (let i = 0; i < properties.length; i += BATCH_SIZE) {
            const batch = properties.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(processProperty));
            if (i % 500 === 0) console.log(`\nProcessed ${i}/${properties.length}`);
        }

        console.log(`\nProperty restoration complete. Restored: ${restoredProps}, Skipped: ${skippedProps}`);

        // --- 2. Restore Areas ---
        // (Optimized with WebP priority)
        const areaRepo = AppDataSource.getRepository(Area);
        const areas = await areaRepo.find();
        console.log(`Found ${areas.length} areas to scan.`);

        let restoredAreas = 0;

        const processArea = async (area: Area) => {
            const prefix = `areas/${area.id}/`;
            try {
                const command = new ListObjectsV2Command({
                    Bucket: BUCKET_NAME,
                    Prefix: prefix
                });
                const response = await s3Client.send(command);
                if (response.Contents && response.Contents.length > 0) {
                    const files = response.Contents.map(c => c.Key!);

                    // WebP priority logic
                    const fileMap = new Map<string, string>();
                    for (const f of files) {
                        const match = f.match(/(.*)\.(jpg|jpeg|png|webp)$/i);
                        if (!match) continue;
                        const base = match[1];
                        const ext = match[2].toLowerCase();

                        const current = fileMap.get(base);
                        if (!current) {
                            fileMap.set(base, f);
                        } else {
                            // Upgrade to webp if current is not webp
                            if (ext === 'webp' && !current.toLowerCase().endsWith('.webp')) {
                                fileMap.set(base, f);
                            }
                        }
                    }
                    const targetFiles = Array.from(fileMap.values());

                    if (targetFiles.length > 0) {
                        const urls = targetFiles.map(key => `${S3_ENDPOINT}/${BUCKET_NAME}/${key}`);
                        await areaRepo.update(area.id, { images: urls });
                        console.log(`Restored ${urls.length} images for area ${area.nameEn}`);
                        restoredAreas++;
                    }
                }
            } catch (e) { }
        };

        // Parallel areas
        await Promise.all(areas.map(processArea));

        console.log(`Area restoration complete. Restored: ${restoredAreas}`);

    } catch (error) {
        console.error(error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

restorePhotos();
