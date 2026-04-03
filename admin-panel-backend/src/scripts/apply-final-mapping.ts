import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';

const PLACEHOLDER_LOGO = 'https://foryou-realestate.com/favicons/icon-light.png';

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

function normalize(s: string) { return (s || '').toLowerCase().trim(); }

/**
 * Randomizes (rotates) the gallery based on property ID to ensure unique thumbnails.
 */
function rotateGallery(photos: string[], propertyId: string): string[] {
    if (photos.length <= 1) return photos;
    
    // Create a stable seed from UUID
    const cleanId = propertyId.replace(/-/g, '');
    const seed = parseInt(cleanId.substring(0, 8), 16);
    
    // Pick an offset among the first 8 photos (or fewer if gallery is small)
    const limit = Math.min(photos.length, 8);
    const offset = seed % limit;
    
    // Rotate: move the selected photo to the front
    const result = [...photos];
    const picked = result.splice(offset, 1)[0];
    result.unshift(picked);
    
    return result;
}

async function applyFinalMapping() {
  try {
    console.log('🔄 Підключення до бази...');
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const offPlan = await repo.find({
        where: { propertyType: PropertyType.OFF_PLAN },
        select: ['id', 'name', 'photos', 'latitude', 'longitude']
    });

    const secondary = await repo.find({
        where: { propertyType: PropertyType.SECONDARY },
        select: ['id', 'description', 'buildingName', 'latitude', 'longitude', 'name']
    });

    const projects = offPlan.map(p => {
        let photosArr: string[] = [];
        const rawPhotos = p.photos as any;
        if (typeof rawPhotos === 'string') {
            photosArr = rawPhotos.split(',').map((x: string) => x.trim()).filter((x: string) => !!x);
        } else if (Array.isArray(rawPhotos)) {
            photosArr = rawPhotos.map((x: any) => String(x));
        }

        return {
            id: p.id,
            name: p.name.trim(),
            lowerName: p.name.trim().toLowerCase(),
            photos: photosArr,
            lat: Number(p.latitude),
            lng: Number(p.longitude)
        };
    }).filter(p => p.photos.length > 0);

    console.log('🏗 Початок мапінгу...');
    const toUpdate: { id: string, photos: string }[] = [];
    let stats = { exact: 0, desc: 0, geo: 0 };

    secondary.forEach(s => {
        const sLat = Number(s.latitude);
        const sLng = Number(s.longitude);
        const sBuilding = normalize(s.buildingName || '');
        const sDesc = normalize(s.description || '');
        
        // Знаходимо найкращий проект (пріоритет: Name > Desc > Geo)
        let foundProject = projects.find(p => sBuilding === p.lowerName);
        if (foundProject) stats.exact++;
        
        if (!foundProject) {
            foundProject = projects.find(p => sDesc.includes(p.lowerName));
            if (foundProject) stats.desc++;
        }

        if (!foundProject && sLat && sLng) {
            foundProject = projects.find(p => p.lat && p.lng && getDistance(sLat, sLng, p.lat, p.lng) <= 50);
            if (foundProject) stats.geo++;
        }

        if (foundProject) {
            const randomized = rotateGallery(foundProject.photos, s.id);
            toUpdate.push({ id: s.id, photos: randomized.join(',') });
        }
    });

    console.log(`\n✅ Мапінг завершено!`);
    console.log(`   ✨ Точна назва: ${stats.exact}`);
    console.log(`   📝 В описі: ${stats.desc}`);
    // console.log(`   🌍 Гео (50м): ${stats.geo}`); // Geo matches sometimes overlap, we take the count
    console.log(`   🌍 Гео (50м): ${stats.geo}`);
    console.log(`   Total to update: ${toUpdate.length}`);

    console.log(`\n💾 Збереження в базу (локально)...`);
    const chunkSize = 200;
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      await Promise.all(chunk.map(item => repo.update(item.id, { photos: item.photos as any })));
      process.stdout.write(`\r   Прогрес: ${Math.min(i + chunkSize, toUpdate.length)}/${toUpdate.length}`);
    }

    console.log('\n\n🚀 ЛОКАЛЬНО ГОТОВО! Тепер ці зміни будуть частиною наступного деплою.');

  } catch (err) { console.error(err); } finally { process.exit(0); }
}

applyFinalMapping();
