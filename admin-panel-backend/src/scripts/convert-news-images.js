
const { AppDataSource } = require('../config/database');
const { News } = require('../entities/News');
const { NewsContent, NewsContentType } = require('../entities/NewsContent');
const { S3_CONFIG, s3Client } = require('../config/s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');

async function convertNewsImages() {
    console.log('Starting News Image Conversion to WebP...');

    // Initialize DB
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    const newsRepo = AppDataSource.getRepository(News);
    const contentRepo = AppDataSource.getRepository(NewsContent);

    const newsList = await newsRepo.find();
    // Filter manually for enumeration if needed, but simple find is ok
    const contentList = await contentRepo.find({ where: { type: NewsContentType.IMAGE } });

    console.log(`Found ${newsList.length} news items and ${contentList.length} content images.`);

    const convertAndUpload = async (originalUrl) => {
        if (!originalUrl) return null;
        if (originalUrl.toLowerCase().endsWith('.webp')) {
            console.log(`Skipping already WebP: ${originalUrl}`);
            return null;
        }

        // Basic check if it's hosted by us (contains our bucket/host)
        if (!originalUrl.includes('your-objectstorage.com') && !originalUrl.includes(S3_CONFIG.bucketName)) {
            console.log(`Skipping external URL: ${originalUrl}`);
            return null;
        }

        try {
            console.log(`Processing: ${originalUrl}`);
            const response = await axios.get(originalUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);

            const webpBuffer = await sharp(buffer)
                .webp({ quality: 80 })
                .toBuffer();

            // Construct new key
            let key = '';
            try {
                // If publicUrl is the base, we remove it
                if (originalUrl.startsWith(S3_CONFIG.publicUrl)) {
                    key = originalUrl.substring(S3_CONFIG.publicUrl.length);
                } else {
                    const urlObj = new URL(originalUrl);
                    key = urlObj.pathname;
                }
            } catch (e) {
                console.error(`Invalid URL: ${originalUrl}`);
                return null;
            }

            // Remove leading slash
            if (key.startsWith('/')) key = key.substring(1);

            // Change extension
            const lastDotIndex = key.lastIndexOf('.');
            if (lastDotIndex === -1) return null;

            const newKey = key.substring(0, lastDotIndex) + '.webp';

            // Upload
            await s3Client.send(new PutObjectCommand({
                Bucket: S3_CONFIG.bucketName,
                Key: newKey,
                Body: webpBuffer,
                ContentType: 'image/webp',
                ACL: 'public-read',
                CacheControl: 'public, max-age=31536000, immutable'
            }));

            const finalUrl = `${S3_CONFIG.publicUrl}/${newKey}`;
            console.log(`--> Converted to: ${finalUrl}`);
            return finalUrl;

        } catch (e) {
            console.error(`Failed to convert ${originalUrl}: ${e.message}`);
            return null;
        }
    };

    // 1. Process News
    for (const news of newsList) {
        if (news.imageUrl) {
            const newUrl = await convertAndUpload(news.imageUrl);
            if (newUrl) {
                news.imageUrl = newUrl;
                await newsRepo.save(news);
                console.log(`Updated News ID: ${news.id}`);
            }
        }
    }

    // 2. Process NewsContents
    for (const content of contentList) {
        if (content.imageUrl) {
            const newUrl = await convertAndUpload(content.imageUrl);
            if (newUrl) {
                content.imageUrl = newUrl;
                await contentRepo.save(content);
                console.log(`Updated Content ID: ${content.id}`);
            }
        }
    }

    console.log('All done.');
    process.exit(0);
}

convertNewsImages().catch(console.error);
