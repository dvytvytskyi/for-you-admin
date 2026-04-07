
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

/**
 * 🚀 FINAL ULTIMATE MAPPING (BUILD, BETA, GEO ONLY)
 * 
 * Sources: OFF_PLAN properties (1,790+)
 * Targets: SECONDARY properties (17,680)
 * 
 * Logic precisely matching off_plan_projects.md Audit:
 * 1. Build: s.buildingname === project.name
 * 2. Beta: s.description includes project.name
 * 3. Geo: dist(s.lat, s.lng, p.lat, p.lng) < 50m
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

async function finalMapping() {
    try {
        console.log('🚀 Starting FINAL ULTIMATE MAPPING v6.0...');
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        console.log('✅ DB Connected');

        // I. Sources (Off-Plan)
        // Note: Using entity fields for loading
        const offPlanDocs = await AppDataSource.getRepository(Property).find({
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

        console.log(`📊 Off-Plan Projects ready: ${projects.length}`);

        // II. Targets (Secondary)
        const secondary = await AppDataSource.getRepository(Property).find({
            where: { propertyType: PropertyType.SECONDARY },
            select: ['id', 'name', 'photos', 'description', 'buildingName', 'latitude', 'longitude']
        });
        console.log(`🔍 Secondary Market properties: ${secondary.length}`);

        let stats = { build: 0, beta: 0, geo: 0, cleaned: 0 };
        const updates = [];

        for (const s of secondary) {
            const sLat = Number(s.latitude);
            const sLng = Number(s.longitude);
            const sBuilding = (s.buildingName || '').toLowerCase().trim();
            const sName = (s.name || '').toLowerCase();
            const sDesc = (s.description || '').toLowerCase();
            const sPhotos = parsePhotos(s.photos).filter(p => !p.includes('logo.png') && !p.includes('placeholder'));
            
            let matchedProject = null;
            let matchType: 'build' | 'beta' | 'geo' | null = null;
            let hasChanges = false;

            // Remove placeholders from existing list
            if (sPhotos.length !== parsePhotos(s.photos).length) {
                stats.cleaned++;
                hasChanges = true;
            }

            // Fill empty photos with Project Photos
            if (sPhotos.length === 0) {
                for (const p of projects) {
                    // Rule 1: Build (Name Match)
                    if (sBuilding && sBuilding === p.lowerName) {
                        matchedProject = p; matchType = 'build'; break;
                    }
                    // Rule 2: Beta (Description Match)
                    if (sDesc.includes(p.lowerName) || sName.includes(p.lowerName)) {
                        matchedProject = p; matchType = 'beta'; break;
                    }
                    // Rule 3: Geo (50m Match)
                    if (sLat && sLng && p.lat && p.lng && getDistance(sLat, sLng, p.lat, p.lng) <= 50) {
                        matchedProject = p; matchType = 'geo'; break;
                    }
                }

                if (matchedProject && matchType) {
                    stats[matchType]++;
                    s.photos = matchedProject.photos.slice(0, 15);
                    updates.push({ id: s.id, photos: s.photos, parentProjectId: matchedProject.id });
                    hasChanges = true;
                }
            }

            // Always update if it only had placeholder
            if (hasChanges && !matchedProject) {
              updates.push({ id: s.id, photos: sPhotos });
            }
        }

        console.log(`📈 AUDIT RESULTS:
   Build: ${stats.build}
   Beta:  ${stats.beta}
   Geo:   ${stats.geo}
   CLEANED PLACES: ${stats.cleaned}
   TOTAL UPDATES: ${updates.length}`);

        if (updates.length > 0) {
            console.log(`🚀 Executing ${updates.length} updates in batches...`);
            const repo = AppDataSource.getRepository(Property);
            const BATCH_SIZE = 50;
            for (let i = 0; i < updates.length; i += BATCH_SIZE) {
                const batch = updates.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(u => repo.update(u.id, { 
                  photos: u.photos, 
                  parentProjectId: (u as any).parentProjectId 
                })));
                process.stdout.write(`\r   Progress: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
            }
            console.log('\n✨ Database Updated Successfully!');
        } else {
            console.log('⚠️ No updates to perform. Check if secondary properties are already filled.');
        }

    } catch (err) {
        console.error('💥 Crash:', err);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

finalMapping();
