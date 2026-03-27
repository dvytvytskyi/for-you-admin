import 'reflect-metadata';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { PropertyFinderProject } from '../entities/PropertyFinderProject';
import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

dotenv.config();

// S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'nbg1',
    endpoint: process.env.AWS_ENDPOINT || 'https://nbg1.your-objectstorage.com',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    },
    forcePathStyle: true
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'foryou';

/**
 * Mirror image to S3
 */
async function mirrorToS3(imageUrl: string, pfId: string): Promise<string> {
    try {
        if (!imageUrl || imageUrl.includes('your-objectstorage.com')) return imageUrl;

        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const fileName = path.basename(imageUrl.split('?')[0]);
        const key = `property-finder/listings/${pfId}/${fileName}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: response.data,
            ContentType: response.headers['content-type'],
            ACL: 'public-read'
        }));

        return `https://nbg1.your-objectstorage.com/${BUCKET_NAME}/${key}`;
    } catch (error: any) {
        console.error(`[S3 Mirror Error] ${imageUrl}:`, error.message);
        return imageUrl;
    }
}

function transformToListingTemplate(item: any) {
    // Transform raw PF listing into our standardized template
    return {
        id: item.id,
        title: item.title,
        price: item.price,
        location: item.location,
        amenities: item.amenities,
        description: item.description,
        developer: item.developer,
        media: item.media,
        status: item.status,
        specifications: item.specifications,
        legal_compliance: item.legal_compliance,
        internal_meta: item.internal_meta
    };
}

async function sync() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log('✅ Database connected');

        const API_KEY = process.env.PROPERTY_FINDER_API_KEY;
        const API_SECRET = process.env.PROPERTY_FINDER_API_SECRET;
        const BASE_URL = 'https://atlas.propertyfinder.com/v1';

        // 1. Auth
        const authResp = await axios.post(`${BASE_URL}/auth/token`, { apiKey: API_KEY, apiSecret: API_SECRET });
        const token = authResp.data.accessToken;

        const headers = {
            'Authorization': `Bearer ${token}`,
            'X-PF-Country': 'ae',
            'X-Domain': 'propertyfinder.ae'
        };

        const richFields = 'amenities,description,age,category,type,developer,media,price,location,uaeEmirate,projectStatus,furnishingType,finishingType,compliance,street,parkingSlots,plotSize,size,assignedTo,createdBy,availableFrom,floorNumber,hasGarden,hasKitchen,hasParkingOnSite,landNumber,mojDeedLocationDescription,numberOfFloors,ownerName,plotNumber,unitNumber,bedrooms,bathrooms';

        // 2. Fetch Location Dictionary (to avoid empty names)
        console.log('--- FETCHING LOCATION DICTIONARY ---');
        const locationMap = new Map();
        try {
            const locationsSearch = await axios.get(`${BASE_URL}/locations`, { 
                headers, 
                params: { perPage: 100, search: 'Dubai' }
            });
            if (locationsSearch.data?.data) {
                locationsSearch.data.data.forEach((loc: any) => {
                    locationMap.set(loc.id.toString(), loc);
                });
            }
            console.log(`Fetched ${locationMap.size} locations into dictionary.`);
        } catch (lErr: any) {
            console.warn(`[WARN] Failed to fetch dictionary: ${lErr.message}. Continuing sync...`);
        }

        // 3. Fetch all listings (projects)
        console.log('--- FETCHING LISTINGS ---');
        const allItems: any[] = [];
        for (let page = 1; page <= 10; page++) {
            console.log(`Fetching page ${page}...`);
            const resp = await axios.get(`${BASE_URL}/listings`, { 
                headers, 
                params: { page, perPage: 100, include: richFields } 
            });
            if (resp.data?.data) {
                allItems.push(...resp.data.data);
            }
            if (!resp.data?.data || resp.data.data.length < 100) break;
        }

        // 3. Process and Mirror
        console.log(`Processing and mirroring ${allItems.length} listings...`);
        const processedProjectIds = new Set<string>();
        const locCache = new Map<string, any>(); // id -> {name, path_name, coords}

        for (const item of allItems) {
            const pfId = item.id;
            
            // Enrich location data using cache or individual fetch
            if (item.location && (!item.location.name || item.location.name === '')) {
                const locId = item.location.id.toString();
                if (locCache.has(locId)) {
                    const cached = locCache.get(locId);
                    item.location.name = cached.name;
                    item.location.path_name = cached.path_name;
                    item.location.coordinates = cached.coordinates;
                } else {
                    console.log(`Fetching name for location ID ${locId}...`);
                    try {
                        const locResp = await axios.get(`${BASE_URL}/locations`, {
                            headers,
                            params: { id: locId } // ПРАВИЛЬНО: використовуємо параметр id
                        });
                        const locData = locResp.data?.data?.[0]; // Візьмемо перший результат
                        if (locData && locData.id.toString() === locId) {
                            item.location.name = locData.name;
                            item.location.path_name = locData.path_name;
                            item.location.coordinates = locData.coordinates;
                            locCache.set(locId, { name: locData.name, path_name: locData.path_name, coordinates: locData.coordinates });
                        }
                    } catch (e: any) {
                        console.warn(`Failed to fetch loc ${locId}: ${e.message}`);
                    }
                }
            }
            
            if (processedProjectIds.has(pfId)) continue;
            processedProjectIds.add(pfId);
            
            // Mirror images
            if (item.media && item.media.images) {
                for (const img of item.media.images) {
                    if (img.original?.url) img.original.url = await mirrorToS3(img.original.url, pfId);
                    if (img.watermarked?.url) img.watermarked.url = await mirrorToS3(img.watermarked.url, pfId);
                }
            }

            const templateData = transformToListingTemplate(item);
            const coverImage = item.media?.images?.[0]?.original?.url || '';
            const dldId = item.compliance?.listingAdvertisementNumber || '';
            const offeringType = (templateData.price?.type === 'yearly' || (!templateData.price?.amounts?.sale && templateData.price?.amounts?.yearly)) ? 'rent' : 'sale';

            console.log(`[UPSERT] pfId: ${pfId} - ${templateData.title?.en}`);
            await AppDataSource.query(`
                INSERT INTO property_finder_projects ("pfId", "offeringType", "title", "location", "developer", "startingPrice", "coverImage", "dldId", "fullData", "lastSyncAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                ON CONFLICT ("pfId") DO UPDATE SET
                    "offeringType" = EXCLUDED."offeringType",
                    "title" = EXCLUDED."title",
                    "location" = EXCLUDED."location",
                    "developer" = EXCLUDED."developer",
                    "startingPrice" = EXCLUDED."startingPrice",
                    "coverImage" = EXCLUDED."coverImage",
                    "dldId" = EXCLUDED."dldId",
                    "fullData" = EXCLUDED."fullData",
                    "lastSyncAt" = EXCLUDED."lastSyncAt",
                    "updatedAt" = NOW()
            `, [
                pfId,
                offeringType,
                JSON.stringify(templateData.title),
                JSON.stringify(item.location),
                JSON.stringify(item.developer),
                (templateData.price?.amounts?.sale || templateData.price?.amounts?.yearly || '0').toString(),
                coverImage,
                dldId,
                JSON.stringify(templateData),
                new Date()
            ]);
        }

        console.log(`--- COMPLETED: ${allItems.length} PROJECTS SYNCED ---`);
    } catch (err: any) {
        console.error('CRITICAL ERROR IN SYNC:', err.message);
    } finally {
        await AppDataSource.destroy();
    }
}

sync();
