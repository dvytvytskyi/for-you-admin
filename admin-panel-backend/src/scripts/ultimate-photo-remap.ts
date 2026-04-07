
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { PropertyFinderProject } from '../entities/PropertyFinderProject';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ULTIMATE PHOTO REMAP (VERSION 2.2)
 * 
 * Logic based on off_plan_projects.md Audit:
 * 1. Building Name Match (Exact/Normalized)
 * 2. Beta Match (Search project name in property description/name)
 * 3. Geo Match (Radius 50m)
 * 
 * Sources: Off-plan Properties AND PF Projects
 */

const PLACEHOLDER_LOGO = 'logo.png';
const PARTIAL_MATCH_RADIUS = 0.00045; // Approx 50m in Dubai

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
        console.log('🚀 Starting ULTIMATE restoration script v2.2...');
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        console.log('✅ DB Connected');

        const pfRepo = AppDataSource.getRepository(PropertyFinderProject);
        const propRepo = AppDataSource.getRepository(Property);

        // 1. Prepare Match Sources
        console.log('📦 Preparing source projects (Off-plan + PF Projects)...');
        const sources: SourceProject[] = [];

        // Source A: Off-Plan Properties
        const offplanItems = await propRepo.find({ where: { propertyType: PropertyType.OFF_PLAN } });
        offplanItems.forEach(item => {
            const photos = parsePhotos(item.photos).filter(p => !p.includes(PLACEHOLDER_LOGO));
            if (photos.length > 0) {
                sources.push({
                    id: item.id,
                    title: item.name,
                    normTitle: normalize(item.name),
                    lat: Number(item.latitude),
                    lng: Number(item.longitude),
                    photos: photos
                });
            }
        });

        // Source B: PF Projects
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
            // Use coordinates from fullData if available, otherwise 0
            let lat = 0, lng = 0;
            if (item.location?.coordinates) {
                lat = item.location.coordinates.lat || 0;
                lng = item.location.coordinates.lon || 0;
            } else if (fd.coordinates) {
                lat = fd.coordinates.lat || 0;
                lng = fd.coordinates.lon || 0;
            }

            if (photos.length > 0 && titleStr) {
                sources.push({
                    id: item.id,
                    title: titleStr,
                    normTitle: normalize(titleStr),
                    lat: Number(lat),
                    lng: Number(lng),
                    photos: photos
                });
            }
        });

        console.log(`📊 Total mapping sources: ${sources.length}`);

        // 2. Process Secondary Properties
        const secondaryCount = await propRepo.count({ where: { propertyType: PropertyType.SECONDARY } });
        console.log(`🔍 Mapping ${secondaryCount} secondary properties...`);
        
        let mappedStats = {
            building: 0,
            beta: 0,
            geo: 0,
            cleaned: 0
        };

        const BATCH_SIZE = 500;
        for (let i = 0; i < secondaryCount; i += BATCH_SIZE) {
            const batch = await propRepo.find({
                where: { propertyType: PropertyType.SECONDARY },
                skip: i,
                take: BATCH_SIZE
            });

            const updateQueue = [];

            for (const prop of batch) {
                let hasChanges = false;
                let currentPhotos = parsePhotos(prop.photos);

                // a. Remove ANY placeholders/logos
                const origLen = currentPhotos.length;
                currentPhotos = currentPhotos.filter(p => !p.includes(PLACEHOLDER_LOGO) && !p.includes('placeholder'));
                if (currentPhotos.length !== origLen) {
                    mappedStats.cleaned++;
                    hasChanges = true;
                }

                // b. Mapping Logic (if no real photos)
                if (currentPhotos.length === 0) {
                    const propNormBuilding = normalize(prop.buildingName || '');
                    const propNormName = normalize(prop.name || '');
                    const propLat = Number(prop.latitude);
                    const propLng = Number(prop.longitude);
                    const propDesc = (prop.description || '').toLowerCase();

                    let matchedSource: SourceProject | null = null;
                    let matchType: 'building' | 'beta' | 'geo' | null = null;

                    // Level 1: Building Match
                    if (propNormBuilding) {
                        matchedSource = sources.find(s => s.normTitle === propNormBuilding) || null;
                        if (matchedSource) matchType = 'building';
                    }

                    // Level 2: Beta (Name in Description)
                    if (!matchedSource) {
                        for (const s of sources) {
                            if (s.normTitle.length < 5) continue;
                            if (propDesc.includes(s.normTitle) || propNormName.includes(s.normTitle)) {
                                matchedSource = s;
                                matchType = 'beta';
                                break;
                            }
                        }
                    }

                    // Level 3: Geo Match (50m)
                    if (!matchedSource && propLat && propLng) {
                        for (const s of sources) {
                            if (!s.lat || !s.lng) continue;
                            const dist = Math.sqrt(Math.pow(s.lat - propLat, 2) + Math.pow(s.lng - propLng, 2));
                            if (dist < PARTIAL_MATCH_RADIUS) {
                                matchedSource = s;
                                matchType = 'geo';
                                break;
                            }
                        }
                    }

                    // Apply Match
                    if (matchedSource) {
                        currentPhotos = matchedSource.photos.slice(0, 15);
                        prop.parentProjectId = matchedSource.id; // Usually it expects a UUID from property_finder_projects
                        hasChanges = true;
                        if (matchType) mappedStats[matchType]++;
                    }
                }

                if (hasChanges) {
                    prop.photos = currentPhotos;
                    updateQueue.push(propRepo.save(prop));
                }
            }

            if (updateQueue.length > 0) await Promise.all(updateQueue);
            process.stdout.write(`\r   Processed: ${Math.min(i + BATCH_SIZE, secondaryCount)}/${secondaryCount} | B:${mappedStats.building} | β:${mappedStats.beta} | G:${mappedStats.geo}`);
        }

        console.log('\n\n✨ ULTIMATE Mapping Complete!');
        console.log(`   Cleaned placeholders:  ${mappedStats.cleaned}`);
        console.log(`   Building Matches:      ${mappedStats.building}`);
        console.log(`   Beta (Desc) Matches:   ${mappedStats.beta}`);
        console.log(`   Geo (50m) Matches:     ${mappedStats.geo}`);
        console.log(`   TOTAL MAPPED:          ${mappedStats.building + mappedStats.beta + mappedStats.geo}`);

    } catch (error) {
        console.error('💥 Error:', error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

run();
