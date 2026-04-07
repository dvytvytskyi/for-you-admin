
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { PropertyFinderProject } from '../entities/PropertyFinderProject';
import * as fs from 'fs';
import * as path from 'path';

/**
 * REELLY RESTORATION v4.0 (BUILD, BETA, GEO ONLY)
 * 
 * Sources: 
 * - reelly_all_projects.json (7,667 items)
 * - DB Off-plan Properties (1,816 items)
 * - DB PF Projects (216 items)
 * 
 * Mapping:
 * - Build: name === name
 * - Beta: description contains name
 * - Geo: radius 50m
 */

const REELLY_JSON_PATH = path.resolve(process.cwd(), '../reelly_all_projects.json');
const PLACEHOLDER_LOGO = 'logo.png';

interface SourceProject {
    id: string;
    name: string;
    lowerName: string;
    lat: number;
    lng: number;
    photos: string[];
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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

async function applyMapping() {
    try {
        console.log('🚀 Starting Restoration v4.0 (Build, Beta, Geo)...');
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        console.log('✅ DB Connected');

        const propRepo = AppDataSource.getRepository(Property);
        const pfRepo = AppDataSource.getRepository(PropertyFinderProject);

        const projectList: SourceProject[] = [];
        const nameToProjectMap = new Map<string, SourceProject>();

        // 1. Load REELLY Projects
        if (fs.existsSync(REELLY_JSON_PATH)) {
            console.log('📖 Loading Reelly projects...');
            const reellyData = JSON.parse(fs.readFileSync(REELLY_JSON_PATH, 'utf-8'));
            reellyData.forEach((item: any) => {
                const photos: string[] = [];
                ['architecture', 'interior', 'lobby', 'buildings'].forEach(key => {
                    const group = item[key];
                    if (Array.isArray(group)) {
                        group.flat().forEach((img: any) => {
                            if (img?.url && !img.url.includes(PLACEHOLDER_LOGO)) photos.push(img.url);
                        });
                    }
                });
                
                if (photos.length > 0) {
                    const coords = item.coordinates?.split(',').map((v: string) => Number(v.trim())) || [0, 0];
                    const sp: SourceProject = {
                        id: `reelly-${item.id}`,
                        name: item.name.trim(),
                        lowerName: item.name.trim().toLowerCase(),
                        lat: coords[0] || 0,
                        lng: coords[1] || 0,
                        photos: Array.from(new Set(photos))
                    };
                    projectList.push(sp);
                    // Use the one with most photos for name mapping
                    const existing = nameToProjectMap.get(sp.lowerName);
                    if (!existing || existing.photos.length < sp.photos.length) {
                        nameToProjectMap.set(sp.lowerName, sp);
                    }
                }
            });
            console.log(`✅ Loaded ${projectList.length} Reelly projects (${nameToProjectMap.size} unique names)`);
        }

        // 2. Load Local Off-Plan Sources
        console.log('📦 Adding local DB off-plan sources...');
        const localOffPlan = await propRepo.find({ where: { propertyType: PropertyType.OFF_PLAN } });
        localOffPlan.forEach(item => {
            const photos = parsePhotos(item.photos).filter(p => !p.includes(PLACEHOLDER_LOGO));
            if (photos.length > 0) {
                const sp: SourceProject = {
                    id: item.id,
                    name: item.name.trim(),
                    lowerName: item.name.trim().toLowerCase(),
                    lat: Number(item.latitude),
                    lng: Number(item.longitude),
                    photos: photos
                };
                projectList.push(sp);
                nameToProjectMap.set(sp.lowerName, sp);
            }
        });

        // 3. Load PF Projects
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
                let lat = 0, lng = 0;
                if (item.location?.coordinates) {
                    lat = item.location.coordinates.lat || 0;
                    lng = item.location.coordinates.lon || 0;
                }
                const sp: SourceProject = {
                    id: item.id,
                    name: titleStr.trim(),
                    lowerName: titleStr.trim().toLowerCase(),
                    lat: Number(lat),
                    lng: Number(lng),
                    photos: photos
                };
                projectList.push(sp);
                nameToProjectMap.set(sp.lowerName, sp);
            }
        });

        console.log(`📊 Total processing sources: ${projectList.length} (${nameToProjectMap.size} unique names)`);

        // 4. Batch Process Secondary
        const secondaryCount = await propRepo.count({ where: { propertyType: PropertyType.SECONDARY } });
        console.log(`🔍 Mapping ${secondaryCount} secondary...`);
        
        let stats = { building: 0, beta: 0, geo: 0, cleaned: 0 };
        const BATCH_SIZE = 1000;

        // Build list of projects with coords for geo matching
        const geoProjects = projectList.filter(p => p.lat && p.lng);

        for (let i = 0; i < secondaryCount; i += BATCH_SIZE) {
            const batch = await propRepo.find({
                where: { propertyType: PropertyType.SECONDARY },
                skip: i,
                take: BATCH_SIZE,
                select: ['id', 'name', 'photos', 'description', 'buildingName', 'latitude', 'longitude', 'parentProjectId']
            });

            const updateQueue = [];

            for (const prop of batch) {
                let currentPhotos = parsePhotos(prop.photos).filter(p => !p.includes(PLACEHOLDER_LOGO) && !p.includes('placeholder'));
                let hasChanges = false;

                if (currentPhotos.length !== parsePhotos(prop.photos).length) {
                    stats.cleaned++;
                    hasChanges = true;
                }

                if (currentPhotos.length === 0) {
                    const sBuilding = (prop.buildingName || '').toLowerCase().trim();
                    const sName = (prop.name || '').toLowerCase();
                    const sDesc = (prop.description || '').toLowerCase();
                    const sLat = Number(prop.latitude);
                    const sLng = Number(prop.longitude);

                    let match: SourceProject | undefined;

                    // I. BUILD (Exact match)
                    if (sBuilding) {
                        match = nameToProjectMap.get(sBuilding);
                        if (match) stats.building++;
                    }

                    // II. BETA (Description match)
                    if (!match) {
                        // Priority search: many names are too short, we only match if name > 5 chars or matches precisely in title
                        // Actually follow audit: sDesc.includes(p.lowerName)
                        for (const [lowerName, sp] of nameToProjectMap) {
                            if (lowerName.length < 5) continue;
                            if (sDesc.includes(lowerName) || sName.includes(lowerName)) {
                                match = sp;
                                stats.beta++;
                                break;
                            }
                        }
                    }

                    // III. GEO (Radius 50m)
                    if (!match && sLat && sLng) {
                        match = geoProjects.find(p => getDistance(sLat, sLng, p.lat, p.lng) <= 50);
                        if (match) stats.geo++;
                    }

                    if (match) {
                        prop.photos = match.photos.slice(0, 20);
                        prop.parentProjectId = match.id.startsWith('reelly') ? undefined : match.id;
                        hasChanges = true;
                    } else {
                        prop.photos = currentPhotos; // Keep cleaned
                    }
                } else {
                    prop.photos = currentPhotos; // Keep current cleaned
                }

                if (hasChanges) {
                    updateQueue.push(propRepo.save(prop));
                }
            }

            if (updateQueue.length > 0) await Promise.all(updateQueue);
            process.stdout.write(`\r   Progress: ${Math.min(i + BATCH_SIZE, secondaryCount)}/${secondaryCount} | B:${stats.building} | β:${stats.beta} | G:${stats.geo}`);
        }

        console.log('\n\n✨ Restoration Complete!');
        console.log(`   Cleaned placeholders:  ${stats.cleaned}`);
        console.log(`   Building (Build):      ${stats.building}`);
        console.log(`   Description (Beta):    ${stats.beta}`);
        console.log(`   Location (Geo):        ${stats.geo}`);
        console.log(`   TOTAL MAPPED:          ${stats.building + stats.beta + stats.geo}`);

    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

applyMapping();
