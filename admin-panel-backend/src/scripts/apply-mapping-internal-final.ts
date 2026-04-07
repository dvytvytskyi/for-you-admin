
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';

/**
 * INTERNAL DB RESTORATION (BUILD, BETA, GEO ONLY)
 * 
 * Logic based on audit-mapping scripts:
 * 1. Source: Property (propertyType = 'off-plan')
 * 2. Target: Property (propertyType = 'secondary')
 * 
 * Matching Level: 
 * - Build (Exact name)
 * - Beta (Name in description)
 * - Geo (Radius 50m)
 */

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

async function runMapping() {
    try {
        console.log('🚀 Starting Internal DB Mapping (Build + Beta + Geo)...');
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        console.log('✅ DB Connected');

        const propRepo = AppDataSource.getRepository(Property);

        // 1. Prepare Sources (Off-Plan)
        console.log('📦 Loading Off-Plan projects from DB...');
        const offPlanItems = await propRepo.find({ 
            where: { propertyType: PropertyType.OFF_PLAN },
            select: ['id', 'name', 'photos', 'latitude', 'longitude']
        });

        const nameToProject = new Map<string, SourceProject>();
        const geoSources: SourceProject[] = [];

        offPlanItems.forEach(item => {
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
                
                // For Build and Beta matching: prefer projects with more photos
                const existing = nameToProject.get(sp.lowerName);
                if (!existing || existing.photos.length < sp.photos.length) {
                    nameToProject.set(sp.lowerName, sp);
                }
                
                if (sp.lat && sp.lng) geoSources.push(sp);
            }
        });

        console.log(`📊 Sources Ready: ${nameToProject.size} unique progetti, ${geoSources.length} geo sources.`);

        // 2. Process Secondary
        const secondaryCount = await propRepo.count({ where: { propertyType: PropertyType.SECONDARY } });
        console.log(`🔍 Mapping ${secondaryCount} secondary market properties...`);
        
        let stats = { build: 0, beta: 0, geo: 0, cleaned: 0 };
        const BATCH_SIZE = 500;

        for (let i = 0; i < secondaryCount; i += BATCH_SIZE) {
            const batch = await propRepo.find({
                where: { propertyType: PropertyType.SECONDARY },
                skip: i,
                take: BATCH_SIZE
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

                    // LEVEL I: Build (Exact Name)
                    if (sBuilding) {
                        match = nameToProject.get(sBuilding);
                        if (match) stats.build++;
                    }

                    // LEVEL II: Beta (In Description)
                    if (!match) {
                        for (const [lowerName, sp] of nameToProject) {
                            if (lowerName.length < 5) continue;
                            if (sDesc.includes(lowerName) || sName.includes(lowerName)) {
                                match = sp;
                                stats.beta++;
                                break;
                            }
                        }
                    }

                    // LEVEL III: Geo (50m)
                    if (!match && sLat && sLng) {
                        match = geoSources.find(s => getDistance(sLat, sLng, s.lat, s.lng) <= 50);
                        if (match) stats.geo++;
                    }

                    if (match) {
                        prop.photos = match.photos.slice(0, 15);
                        // Optional: update parentProjectId if empty
                        if (!prop.parentProjectId) prop.parentProjectId = match.id;
                        hasChanges = true;
                    } else {
                        prop.photos = currentPhotos; // If no match, use whatever's left (often empty)
                    }
                } else {
                    prop.photos = currentPhotos; // Keep existing non-placeholder photos
                }

                if (hasChanges) {
                    updateQueue.push(propRepo.save(prop));
                }
            }

            if (updateQueue.length > 0) await Promise.all(updateQueue);
            process.stdout.write(`\r   Progress: ${Math.min(i + BATCH_SIZE, secondaryCount)}/${secondaryCount} | B:${stats.build} | β:${stats.beta} | G:${stats.geo}`);
        }

        console.log('\n\n✅ Internal DB Restoration Complete!');
        console.log(`   Cleaned placeholders:  ${stats.cleaned}`);
        console.log(`   Build Matches:         ${stats.build}`);
        console.log(`   Beta (Desc) Matches:   ${stats.beta}`);
        console.log(`   Geo (50m) Matches:     ${stats.geo}`);
        console.log(`   TOTAL MAPPED:          ${stats.build + stats.beta + stats.geo}`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

runMapping();
