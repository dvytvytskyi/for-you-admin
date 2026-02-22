const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { AppDataSource } = require('../config/database');
const { Property } = require('../entities/Property');
const { Area } = require('../entities/Area');
const { Developer } = require('../entities/Developer');
const { News } = require('../entities/News');
const { PortfolioItem } = require('../entities/PortfolioItem');
const { PropertyUnit } = require('../entities/PropertyUnit');
const sharp = require('sharp');
const { Readable } = require('stream');

const S3_CONFIG = {
    bucketName: 'foryou',
    endpoint: 'https://nbg1.your-objectstorage.com',
    region: 'nbg1',
    accessKeyId: 'NO4DMOF39TSO56UNYT0O',
    secretAccessKey: 'vmWltjsWNRcIFCUkz5HI51RQw0q21uSs9qB9cUkW',
    publicUrl: 'https://nbg1.your-objectstorage.com/foryou'
};

const s3Client = new S3Client({
    region: S3_CONFIG.region,
    endpoint: S3_CONFIG.endpoint,
    credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
});

const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

async function convertS3ToWebp() {
    try {
        console.log('🚀 Starting "Off-Plan Only" S3 to WebP conversion process...');
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log('✅ Database connected.');

        const bucket = S3_CONFIG.bucketName;

        const processUrl = async (url) => {
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
                    // Does not exist -> convert
                }

                console.log(`🔄 Converting: ${key} -> ${newKey}`);

                const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
                const getResponse = await s3Client.send(getCommand);
                const buffer = await streamToBuffer(getResponse.Body);

                const webpBuffer = await sharp(buffer)
                    .webp({ quality: 80 })
                    .toBuffer();

                await s3Client.send(new PutObjectCommand({
                    Bucket: bucket,
                    Key: newKey,
                    Body: webpBuffer,
                    ContentType: 'image/webp',
                }));

                console.log(`✅ Uploaded: ${newKey}`);
                return url.replace(key, newKey);

            } catch (err) {
                console.error(`❌ Failed to process ${key}:`, err.message);
                return url;
            }
        };

        const processArray = async (arr) => {
            if (!arr) return arr;
            const res = [];
            for (const item of arr) {
                res.push((await processUrl(item)) || item);
            }
            return res;
        };

        // 1. Off-Plan Properties Only
        console.log('🔍 Fetching Off-Plan Properties...');
        const properties = await AppDataSource.getRepository(Property).find({
            where: { propertyType: 'off-plan' }
        });
        console.log(`Found ${properties.length} off-plan properties.`);

        for (const p of properties) {
            let changed = false;
            const updatedPhotos = await processArray(p.photos);
            if (JSON.stringify(updatedPhotos) !== JSON.stringify(p.photos)) {
                p.photos = updatedPhotos;
                changed = true;
            }

            if (changed) {
                await AppDataSource.getRepository(Property).save(p);
                console.log(`💾 Updated Property: ${p.id}`); // p.name might be undefined in some contexts or missing from fetch if strict
            }
        }

        // 2. Units (For Off-Plan properties)
        console.log('🔍 Processing Units for found Off-Plan Properties...');
        for (const p of properties) {
            const units = await AppDataSource.getRepository(PropertyUnit).find({ where: { propertyId: p.id } });
            for (const u of units) {
                const updated = await processUrl(u.planImage);
                if (updated !== u.planImage) {
                    u.planImage = updated;
                    await AppDataSource.getRepository(PropertyUnit).save(u);
                    console.log(`💾 Updated Unit for ${p.id}`);
                }
            }
        }

        // 3. Areas
        console.log('🔍 Processing Areas...');
        const areas = await AppDataSource.getRepository(Area).find();
        for (const a of areas) {
            const updatedImages = await processArray(a.images);
            if (JSON.stringify(updatedImages) !== JSON.stringify(a.images)) {
                a.images = updatedImages;
                await AppDataSource.getRepository(Area).save(a);
                console.log(`💾 Updated Area: ${a.nameEn}`);
            }
        }

        // 4. Developers
        console.log('🔍 Processing Developers...');
        const devs = await AppDataSource.getRepository(Developer).find();
        for (const d of devs) {
            let changed = false;
            const updatedLogo = await processUrl(d.logo);
            if (updatedLogo !== d.logo) { d.logo = updatedLogo; changed = true; }

            const updatedImages = await processArray(d.images);
            if (JSON.stringify(updatedImages) !== JSON.stringify(d.images)) {
                d.images = updatedImages;
                changed = true;
            }
            if (changed) {
                await AppDataSource.getRepository(Developer).save(d);
                console.log(`💾 Updated Developer: ${d.name}`);
            }
        }

        // 5. News
        console.log('🔍 Processing News...');
        const newsList = await AppDataSource.getRepository(News).find();
        for (const n of newsList) {
            const updated = await processUrl(n.imageUrl);
            if (updated !== n.imageUrl) {
                n.imageUrl = updated;
                await AppDataSource.getRepository(News).save(n);
                console.log(`💾 Updated News: ${n.title}`);
            }
        }

        // 6. Portfolio Items
        console.log('🔍 Processing Portfolio Items...');
        const portfolioItems = await AppDataSource.getRepository(PortfolioItem).find();
        for (const pi of portfolioItems) {
            let changed = false;
            const updatedPhotos = await processArray(pi.photos);
            if (JSON.stringify(updatedPhotos) !== JSON.stringify(pi.photos)) {
                pi.photos = updatedPhotos;
                changed = true;
            }
            const updatedFloorPlans = await processArray(pi.floorPlans);
            if (JSON.stringify(updatedFloorPlans) !== JSON.stringify(pi.floorPlans)) {
                pi.floorPlans = updatedFloorPlans;
                changed = true;
            }
            if (pi.documents) {
                const updatedDocs = [];
                for (const doc of pi.documents) {
                    updatedDocs.push({
                        ...doc,
                        url: (await processUrl(doc.url)) || doc.url
                    });
                }
                if (JSON.stringify(updatedDocs) !== JSON.stringify(pi.documents)) {
                    pi.documents = updatedDocs;
                    changed = true;
                }
            }

            if (changed) {
                await AppDataSource.getRepository(PortfolioItem).save(pi);
                console.log(`💾 Updated Portfolio Item: ${pi.id}`);
            }
        }

        console.log('✅ Targeted Conversion and DB Update Complete.');

    } catch (error) {
        console.error('💥 Conversion failed:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

convertS3ToWebp();
