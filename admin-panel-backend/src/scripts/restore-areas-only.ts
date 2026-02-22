
import 'reflect-metadata';
import { Area } from '../entities/Area';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { AppDataSource } from '../config/database';

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

async function restoreAreas() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

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

        await Promise.all(areas.map(processArea));

        console.log(`Area restoration complete. Restored: ${restoredAreas}`);

    } catch (error) {
        console.error(error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

restoreAreas();
