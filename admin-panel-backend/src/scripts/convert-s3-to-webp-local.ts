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

// Helper to convert stream to buffer
const streamToBuffer = (stream: Readable): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

async function convertS3ToWebpLocal() {
    try {
        console.log('🚀 Starting LOCAL S3 to WebP conversion (Reverse Order)...');
        // Note: Database connection will be handled by environment variable passed to this script
        await AppDataSource.initialize();
        console.log('✅ Connected to PRODUCTION Database via Tunnel.');

        const bucket = S3_CONFIG.bucketName;

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
                } catch (e) {
                }

                console.log(`🔄 [Local] Converting: ${key} -> ${newKey}`);

                const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
                const getResponse = await s3Client.send(getCommand);
                const buffer = await streamToBuffer(getResponse.Body as Readable);

                const webpBuffer = await sharp(buffer)
                    .webp({ quality: 80 })
                    .toBuffer();

                const putCommand = new PutObjectCommand({
                    Bucket: bucket,
                    Key: newKey,
                    Body: webpBuffer,
                    ContentType: 'image/webp',
                });
                await s3Client.send(putCommand);

                console.log(`✅ [Local] Uploaded: ${newKey}`);
                return url.replace(key, newKey);

            } catch (err) {
                console.error(`❌ [Local] Failed to process ${key}:`, err);
                return url;
            }
        };

        const processArray = async (arr: string[] | undefined): Promise<string[] | undefined> => {
            if (!arr) return arr;
            const res: string[] = [];
            for (const item of arr) {
                res.push((await processUrl(item)) || item);
            }
            return res;
        };

        // 1. Off-Plan Properties (REVERSED)
        console.log('🔍 Fetching Off-Plan Properties...');
        const properties = await AppDataSource.getRepository(Property).find({
            where: { propertyType: 'off-plan' as any }
        });
        console.log(`Found ${properties.length} off-plan properties. Processing in REVERSE order.`);

        // REVERSE to avoid collision with server script
        properties.reverse();

        for (const p of properties) {
            let changed = false;
            const updatedPhotos = await processArray(p.photos);
            if (JSON.stringify(updatedPhotos) !== JSON.stringify(p.photos)) {
                p.photos = updatedPhotos!;
                changed = true;
            }

            if (changed) {
                await AppDataSource.getRepository(Property).save(p);
                console.log(`💾 [Local] Updated Property: ${p.name}`);
            }
        }

        // 2. Units (REVERSED)
        console.log('🔍 Processing Units...');
        // We'll just fetch all units for simplicity in local script, or filter if needed? 
        // Let's stick to the same logic: Units for these properties
        for (const p of properties) {
            const units = await AppDataSource.getRepository(PropertyUnit).find({ where: { propertyId: p.id } });
            // units.reverse(); // Units per property is small list, no need to reverse
            for (const u of units) {
                const updated = await processUrl(u.planImage);
                if (updated !== u.planImage) {
                    u.planImage = updated!;
                    await AppDataSource.getRepository(PropertyUnit).save(u);
                    console.log(`💾 [Local] Updated Unit for ${p.name}`);
                }
            }
        }

        // 3. Areas (REVERSED)
        console.log('🔍 Processing Areas...');
        const areas = await AppDataSource.getRepository(Area).find();
        areas.reverse();
        for (const a of areas) {
            const updatedImages = await processArray(a.images);
            if (JSON.stringify(updatedImages) !== JSON.stringify(a.images)) {
                a.images = updatedImages!;
                await AppDataSource.getRepository(Area).save(a);
                console.log(`💾 [Local] Updated Area: ${a.nameEn}`);
            }
        }

        // 4. Developers (REVERSED)
        console.log('🔍 Processing Developers...');
        const devs = await AppDataSource.getRepository(Developer).find();
        devs.reverse();
        for (const d of devs) {
            let changed = false;
            const updatedLogo = await processUrl(d.logo);
            if (updatedLogo !== d.logo) { d.logo = updatedLogo!; changed = true; }

            const updatedImages = await processArray(d.images);
            if (JSON.stringify(updatedImages) !== JSON.stringify(d.images)) {
                d.images = updatedImages!;
                changed = true;
            }
            if (changed) {
                await AppDataSource.getRepository(Developer).save(d);
                console.log(`💾 [Local] Updated Developer: ${d.name}`);
            }
        }

        // 5. News (REVERSED)
        console.log('🔍 Processing News...');
        const newsList = await AppDataSource.getRepository(News).find();
        newsList.reverse();
        for (const n of newsList) {
            const updated = await processUrl(n.imageUrl);
            if (updated !== n.imageUrl) {
                n.imageUrl = updated!;
                await AppDataSource.getRepository(News).save(n);
                console.log(`💾 [Local] Updated News: ${n.title}`);
            }
        }

        console.log('✅ [Local] Conversion Complete.');

    } catch (error) {
        console.error('💥 [Local] Conversion failed:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(0);
    }
}

convertS3ToWebpLocal();
