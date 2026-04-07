
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { PropertyFinderProject } from '../entities/PropertyFinderProject';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ULTIMATE REELLY RESTORATION (VERSION 3.0)
 * 
 * Logic:
 * 1. Load Reelly Projects (7,667 items)
 * 2. Load Off-plan + PF Projects (2,032 items)
 * 3. Map Secondary Properties by Building, Beta (Description), and Geo.
 */

const REELLY_JSON_PATH = path.resolve(process.cwd(), '../reelly_all_projects.json');
const PLACEHOLDER_LOGO = 'logo.png';
const PARTIAL_MATCH_RADIUS = 0.00045; // ~50m

interface SourceProject {
    id: string;
    title: string;
    normTitle: string;
    lat: number;
    lng: number;
    photos: string[];
}

function normalize(str: string): string {
    return (str || '')
        .toLowerCase()
        .replace(/\b(the|tower|towers|residence|residences|building|apartments|villa|villas|hotel|tower[\s]?a|tower[\s]?b|tower[\s]?c|tower[\s]?d|tower[\s]?1|tower[\s]?2|tower[\s]?3|tower[\s]?4|tower[\s]?5)\b/gi, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function parsePhotos(photos: any): string[] {
    if (!photos) return [];
    if (Array.isArray(photos)) return photos;
    if (typeof photos === 'string') {
        const p = photos.trim();
        if (p.startsWith('[') && p.endsWith(']')) {
            try { return JSON.parse(p); } catch (e) {}
        }
        return p.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
}

async function run() {
    try {
        console.log('🚀 Starting REELLY Restoration v3.0...');
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        console.log('✅ DB Connected');

        const propRepo = AppDataSource.getRepository(Property);
        const pfRepo = AppDataSource.getRepository(PropertyFinderProject);

        const sourceMap = new Map<string, SourceProject>();
        const geoSources: SourceProject[] = [];

        // 1. Load REELLY Projects
        if (fs.existsSync(REELLY_JSON_PATH)) {
            console.log('📖 Loading Reelly projects...');
            const reellyData = JSON.parse(fs.readFileSync(REELLY_JSON_PATH, 'utf-8'));
            reellyData.forEach((item: any) => {
                const photos: string[] = [];
                // Collect URLs from architecture, interior, lobby, and buildings
                ['architecture', 'interior', 'lobby', 'buildings'].forEach(key => {
                    const group = item[key];
                    if (Array.isArray(group)) {
                        group.flat().forEach((img: any) => {
                            if (img?.url && !img.url.includes(PLACEHOLDER_LOGO)) photos.push(img.url);
                        });
                    }
                });
                
                if (photos.length > 0) {
                    const norm = normalize(item.name);
                    const coords = item.coordinates?.split(',').map((v: string) => Number(v.trim())) || [0, 0];
                    const sp: SourceProject = {
                        id: `reelly-${item.id}`,
                        title: item.name,
                        normTitle: norm,
                        lat: coords[0] || 0,
                        lng: coords[1] || 0,
                        photos: Array.from(new Set(photos)) // Unique only
                    };
                    if (norm) {
                        // Keep the one with more photos if duplicate name
                        const existing = sourceMap.get(norm);
                        if (!existing || existing.photos.length < sp.photos.length) {
                            sourceMap.set(norm, sp);
                        }
                    }
                    if (sp.lat && sp.lng) geoSources.push(sp);
                }
            });
            console.log(`✅ Loaded ${sourceMap.size} unique Reelly projects`);
        }

        // 2. Load Local Off-Plan Sources (to prioritize S3 photos)
        console.log('📦 Adding local DB sources...');
        const localOffPlan = await propRepo.find({ where: { propertyType: PropertyType.OFF_PLAN } });
        localOffPlan.forEach(item => {
            const photos = parsePhotos(item.photos).filter(p => !p.includes(PLACEHOLDER_LOGO));
            if (photos.length > 0) {
                const norm = normalize(item.name);
                const sp: SourceProject = {
                    id: item.id,
                    title: item.name,
                    normTitle: norm,
                    lat: Number(item.latitude),
                    lng: Number(item.longitude),
                    photos: photos
                };
                sourceMap.set(norm, sp);
                if (sp.lat && sp.lng) geoSources.push(sp);
            }
        });

        const pfItems = await pfRepo.find();
        pfItems.forEach(item => {
            const titleStr = (typeof item.title === 'string' ? item.title : item.title?.en) || '';
            const photos: string[] = [];
            if (item.coverImage && !item.coverImage.includes(PLACEHOLDER_LOGO)) photos.push(item.coverImage);
            const fd = item.fullData || {};
            if (fd.media?.images && Array.isArray(fd.media.images)) {
                fd.media.images.forEach((img: any) => {
                    const url = img.original?.url || img.watermarked?.url;
                    if (url && !photos.includes(url) && !url.includes(PLACEHOLDER_LOGO)) photos.push(url);
                });
            }
            if (photos.length > 0 && titleStr) {
                const norm = normalize(titleStr);
                let lat = 0, lng = 0;
                if (item.location?.coordinates) {
                    lat = item.location.coordinates.lat || 0;
                    lng = item.location.coordinates.lon || 0;
                }
                const sp: SourceProject = {
                    id: item.id,
                    title: titleStr,
                    normTitle: norm,
                    lat: Number(lat),
                    lng: Number(lng),
                    photos: photos
                };
                sourceMap.set(norm, sp);
                if (sp.lat && sp.lng) geoSources.push(sp);
            }
        });

        console.log(`📊 Final unique mapping sources: ${sourceMap.size}`);

        // 3. Process Secondary Properties
        const secondaryCount = await propRepo.count({ where: { propertyType: PropertyType.SECONDARY } });
        console.log(`🔍 Processing ${secondaryCount} secondary properties...`);
        
        let stats = { building: 0, beta: 0, geo: 0, skipped: 0 };
        const BATCH_SIZE = 1000;

        for (let i = 0; i < secondaryCount; i += BATCH_SIZE) {
            const batch = await propRepo.find({
                where: { propertyType: PropertyType.SECONDARY },
                skip: i,
                take: BATCH_SIZE
            });

            const updateQueue = [];

            for (const prop of batch) {
                let currentPhotos = parsePhotos(prop.photos).filter(p => !p.includes(PLACEHOLDER_LOGO) && !p.includes('placeholder'));
                
                if (currentPhotos.length > 0) {
                    stats.skipped++;
                    continue;
                }

                const propNormBuilding = normalize(prop.buildingName || '');
                const propNormName = normalize(prop.name || '');
                const propLat = Number(prop.latitude);
                const propLng = Number(prop.longitude);
                const propDesc = (prop.description || '').toLowerCase();

                let match: SourceProject | undefined;

                // Level 1: Building Match
                if (propNormBuilding) {
                    match = sourceMap.get(propNormBuilding);
                }

                // Level 2: Beta (Name in Desc/Title)
                if (!match) {
                    // Optimized: only search among relevant district sources could be better, but let's do global for first pass
                    // To avoid O(N*M), we only check most popular projects or exact keywords
                    // But the user audit says 95% description coverage, so we must search.
                    // We'll only search sources that are longer than 6 chars to avoid false positives
                    for (const [norm, s] of sourceMap) {
                        if (norm.length < 7) continue;
                        if (propDesc.includes(norm) || propNormName.includes(norm)) {
                            match = s;
                            stats.beta++;
                            break;
                        }
                    }
                } else {
                    stats.building++;
                }

                // Level 3: Geo Match
                if (!match && propLat && propLng) {
                    match = geoSources.find(s => {
                        return Math.abs(s.lat - propLat) < PARTIAL_MATCH_RADIUS && 
                               Math.abs(s.lng - propLng) < PARTIAL_MATCH_RADIUS;
                    });
                    if (match) stats.geo++;
                }

                if (match) {
                    prop.photos = match.photos.slice(0, 20); // Limit to 20 photos
                    updateQueue.push(propRepo.save(prop));
                }
            }

            if (updateQueue.length > 0) await Promise.all(updateQueue);
            process.stdout.write(`\r   Progress: ${Math.min(i + BATCH_SIZE, secondaryCount)}/${secondaryCount} | B:${stats.building} | β:${stats.beta} | G:${stats.geo}`);
        }

        console.log('\n\n✅ Restoration Complete!');
        console.log(`   Building Matches:   ${stats.building}`);
        console.log(`   Description (Beta): ${stats.beta}`);
        console.log(`   Geo Matches:        ${stats.geo}`);
        console.log(`   TOTAL MAPPED:       ${stats.building + stats.beta + stats.geo} / ${secondaryCount}`);

    } catch (error) {
        console.error('💥 Crash:', error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

run();
