/* eslint-disable */
// restore-photos-prod.js
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { AppDataSource } = require('../config/database');
const { Property } = require('../entities/Property');

const BUCKET_NAME = 'foryou';
const S3_ENDPOINT = 'https://nbg1.your-objectstorage.com';
const S3_REGION = 'nbg1';

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
        console.log('Using Production Config...');
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log(`DB_CONNECTED`);

        const propertyRepo = AppDataSource.getRepository(Property);
        console.log('Fetching properties...');
        const properties = await propertyRepo.find({
            select: ['id', 'photos']
        });
        console.log(`Found ${properties.length} properties.`);

        let restoredProps = 0;
        let skippedProps = 0;

        const processProperty = async (prop) => {
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
                    const files = response.Contents.map(c => c.Key);

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
                    }
                }
            } catch (err) {
            }
        };

        const BATCH_SIZE = 50;
        for (let i = 0; i < properties.length; i += BATCH_SIZE) {
            const batch = properties.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(processProperty));
            if (i % 500 === 0) console.log(`Processed ${i}/${properties.length}`);
        }

        console.log(`Property restoration complete. Restored: ${restoredProps}, Skipped: ${skippedProps}`);

    } catch (error) {
        console.error(error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

restorePhotos();
