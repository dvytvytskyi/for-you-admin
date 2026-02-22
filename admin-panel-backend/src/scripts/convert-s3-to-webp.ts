import { ListObjectsV2Command, GetObjectCommand, PutObjectCommand, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { s3Client, S3_CONFIG } from '../config/s3';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';
import { Area } from '../entities/Area';
import { Developer } from '../entities/Developer';
import { News } from '../entities/News';
import { NewsContent } from '../entities/NewsContent';
import { CourseContent } from '../entities/CourseContent';
import { PortfolioItem } from '../entities/PortfolioItem';
import { PropertyUnit } from '../entities/PropertyUnit';
import sharp from 'sharp';
import { Readable } from 'stream';

// --- CONFIGURATION & ARGS ---
const args = process.argv.slice(2);
const prefixesArg = args.find(a => a.startsWith('--prefixes='))?.split('=')[1] || '';
const workerName = args.find(a => a.startsWith('--name='))?.split('=')[1] || 'default';
const PREFIXES = prefixesArg ? prefixesArg.split('') : [];

// Helper to convert stream to buffer
const streamToBuffer = (stream: Readable): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

async function convertS3ToWebp() {
    try {
        console.log(`🚀 Starting Worker [${workerName}] WebP conversion process...`);
        if (PREFIXES.length > 0) {
            console.log(`🔍 Shard Filter: ID starts with [${PREFIXES.join(', ')}]`);
        }

        await AppDataSource.initialize();
        console.log('✅ Database connected.');

        const bucket = S3_CONFIG.bucketName;

        // ... existing processUrl and processArray logic ...
        const processUrl = async (url: string | undefined): Promise<string | undefined> => {
            if (!url) return url;
            if (!url.includes(S3_CONFIG.endpoint) && !url.includes('your-objectstorage.com')) return url;
            const urlParts = url.split(bucket + '/');
            if (urlParts.length < 2) return url;
            const key = urlParts[1];
            if (!key) return url;
            const lowerKey = key.toLowerCase();
            if (lowerKey.endsWith('.webp')) return url;
            if (!lowerKey.endsWith('.jpg') && !lowerKey.endsWith('.jpeg') && !lowerKey.endsWith('.png')) return url;
            const newKey = key.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            try {
                try {
                    await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: newKey }));
                    return url.replace(key, newKey);
                } catch (e) { }
                console.log(`[${workerName}] 🔄 Converting: ${key}`);
                const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
                const getResponse = await s3Client.send(getCommand);
                const buffer = await streamToBuffer(getResponse.Body as Readable);
                const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
                await s3Client.send(new PutObjectCommand({
                    Bucket: bucket, Key: newKey, Body: webpBuffer, ContentType: 'image/webp', ACL: 'public-read'
                }));
                return url.replace(key, newKey);
            } catch (err) {
                console.error(`❌ Failed ${key}:`, err);
                return url;
            }
        };

        const processArray = async (arr: string[] | undefined): Promise<string[] | undefined> => {
            if (!arr) return arr;
            const res: string[] = [];
            for (const item of arr) { res.push((await processUrl(item)) || item); }
            return res;
        };

        // 1. Off-Plan Properties Only (with Sharding)
        console.log('🔍 Fetching Off-Plan Properties...');
        const propertyRepo = AppDataSource.getRepository(Property);
        const queryBuilder = propertyRepo.createQueryBuilder('property')
            .where('property.propertyType = :type', { type: 'off-plan' });

        if (PREFIXES.length > 0) {
            const regexPattern = `^([${PREFIXES.join('')}])`;
            queryBuilder.andWhere('property.id::text ~* :regex', { regex: regexPattern });
        }

        const properties = await queryBuilder.getMany();
        console.log(`[${workerName}] Found ${properties.length} properties to check.`);

        for (const p of properties) {
            let changed = false;
            const updatedPhotos = await processArray(p.photos);
            if (JSON.stringify(updatedPhotos) !== JSON.stringify(p.photos)) {
                p.photos = updatedPhotos!;
                changed = true;
            }

            if (changed) {
                await propertyRepo.save(p);
                console.log(`[${workerName}] 💾 Updated: ${p.id}`);
            }
        }

        // 2. Units for those properties
        console.log(`[${workerName}] Processing Units...`);
        for (const p of properties) {
            const units = await AppDataSource.getRepository(PropertyUnit).find({ where: { propertyId: p.id } });
            for (const u of units) {
                const updated = await processUrl(u.planImage);
                if (updated !== u.planImage) {
                    u.planImage = updated!;
                    await AppDataSource.getRepository(PropertyUnit).save(u);
                }
            }
        }

        console.log(`✅ Worker [${workerName}] Finished.`);
    } catch (error) {
        console.error(`💥 Worker [${workerName}] failed:`, error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

convertS3ToWebp();
