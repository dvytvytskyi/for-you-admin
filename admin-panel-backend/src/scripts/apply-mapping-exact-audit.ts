
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

/**
 * EXACT AUDIT RESTORATION v5.0 (Identical to partial-mapping-scan.ts logic)
 * 
 * Logic copied from partial-mapping-scan.ts:
 * 1. Build: sBuilding === p.lowerName
 * 2. Beta: sDesc.includes(p.lowerName)
 * 3. Geo: getDistance <= 50m
 * 
 * NO PARTIAL MATCHING.
 * Source: OFF_PLAN properties.
 */

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
        console.log('🚀 Starting Restoration v5.0 (EXACT Audit Logic)...');
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        console.log('✅ DB Connected');

        const propRepo = AppDataSource.getRepository(Property);

        // 1. Prepare projects (Sources) - same logic as audit
        console.log('📦 Loading Off-Plan projects...');
        const offPlanDocs = await propRepo.find({
            where: { propertyType: PropertyType.OFF_PLAN },
            select: ['id', 'name', 'photos', 'latitude', 'longitude']
        });

        const projects = offPlanDocs.map(p => ({
            id: p.id,
            name: p.name.trim(),
            lowerName: p.name.trim().toLowerCase(),
            lat: Number(p.latitude),
            lng: Number(p.longitude),
            photos: parsePhotos(p.photos).filter(url => !url.includes('logo.png'))
        })).filter(p => p.lowerName.length > 2 && p.photos.length > 0);

        console.log(`📊 Total project sources with photos: ${projects.length}`);

        // 2. Prepare Secondary (Targets)
        const secondary = await propRepo.find({
            where: { propertyType: PropertyType.SECONDARY },
            select: ['id', 'name', 'photos', 'description', 'buildingName', 'latitude', 'longitude']
        });
        console.log(`🔍 Mapping ${secondary.length} secondary properties...`);

        let stats = { build: 0, beta: 0, geo: 0, cleaned: 0 };
        const updates = [];

        for (const s of secondary) {
            const sLat = Number(s.latitude);
            const sLng = Number(s.longitude);
            const sBuilding = (s.buildingName || '').toLowerCase().trim();
            const sDesc = (s.description || '').toLowerCase();
            const sPhotos = parsePhotos(s.photos).filter(p => !p.includes('logo.png') && !p.includes('placeholder'));
            
            let matchedProject = null;
            let matchType: 'build' | 'beta' | 'geo' | null = null;
            let hasChanges = false;

            // Remove placeholders from original
            if (sPhotos.length !== parsePhotos(s.photos).length) {
                stats.cleaned++;
                hasChanges = true;
            }

            // Only map if empty or only had logos
            if (sPhotos.length === 0) {
                for (const p of projects) {
                    // 1. Build
                    if (sBuilding && sBuilding === p.lowerName) {
                        matchedProject = p; matchType = 'build'; break;
                    }
                    // 2. Beta
                    if (sDesc.includes(p.lowerName)) {
                        matchedProject = p; matchType = 'beta'; break;
                    }
                    // 3. Geo
                    if (sLat && sLng && p.lat && p.lng && getDistance(sLat, sLng, p.lat, p.lng) <= 50) {
                        matchedProject = p; matchType = 'geo'; break;
                    }
                }

                if (matchedProject && matchType) {
                    stats[matchType]++;
                    s.photos = matchedProject.photos.slice(0, 15);
                    updates.push(propRepo.update(s.id, { photos: s.photos, parentProjectId: matchedProject.id }));
                    hasChanges = true;
                }
            }
            
            if (hasChanges && !matchedProject) {
                // If it only had logo.png, clear it
                updates.push(propRepo.update(s.id, { photos: sPhotos }));
            }
        }

        console.log(`📦 Running ${updates.length} updates in batches...`);
        const BATCH_SIZE = 100;
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            await Promise.all(updates.slice(i, i + BATCH_SIZE));
            process.stdout.write(`\r   Progress: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
        }

        console.log('\n\n✅ Restoration Complete!');
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

applyMapping();
