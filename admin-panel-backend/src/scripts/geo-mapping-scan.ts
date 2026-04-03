import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';

/**
 * Calculates distance between two points in meters (Haversine formula)
 */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

async function geoMapping() {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);

    const offPlan = await repo.find({
        where: { propertyType: PropertyType.OFF_PLAN },
        select: ['id', 'name', 'latitude', 'longitude']
    });

    const secondary = await repo.find({
        where: { propertyType: PropertyType.SECONDARY },
        select: ['id', 'description', 'buildingName', 'latitude', 'longitude']
    });

    console.log(`🔍 Total Secondary: ${secondary.length}`);
    console.log(`🔍 Total Off-Plan: ${offPlan.length}`);

    const geoMatchCounts: Record<string, number> = {};
    const betaMatchCounts: Record<string, number> = {};
    const exactMatchCounts: Record<string, number> = {};
    
    const uniqueGeoIds = new Set<string>();
    const uniqueBetaIds = new Set<string>();
    const uniqueExactIds = new Set<string>();
    const allMatchedIds = new Set<string>();

    const projects = offPlan.map(p => ({
        id: p.id,
        name: p.name.trim(),
        lowerName: p.name.trim().toLowerCase(),
        lat: Number(p.latitude),
        lng: Number(p.longitude)
    })).filter(p => p.lat && p.lng);

    console.log(`🔄 Сканування гео-координат (радіус 50м)...`);

    projects.forEach(p => {
        geoMatchCounts[p.id] = 0;
        betaMatchCounts[p.id] = 0;
        exactMatchCounts[p.id] = 0;
    });

    secondary.forEach(s => {
        const sLat = Number(s.latitude);
        const sLng = Number(s.longitude);
        const sBuilding = (s.buildingName || '').toLowerCase().trim();
        const sDesc = (s.description || '').toLowerCase();

        projects.forEach(p => {
            let matched = false;
            // 1. Exact
            if (sBuilding && sBuilding === p.lowerName) {
                exactMatchCounts[p.id]++;
                uniqueExactIds.add(s.id);
                matched = true;
            }
            // 2. Beta
            if (sDesc.includes(p.lowerName)) {
                betaMatchCounts[p.id]++;
                uniqueBetaIds.add(s.id);
                matched = true;
            }
            // 3. Geo
            if (sLat && sLng && p.lat && p.lng) {
                const dist = getDistance(sLat, sLng, p.lat, p.lng);
                if (dist <= 50) {
                    geoMatchCounts[p.id]++;
                    uniqueGeoIds.add(s.id);
                    matched = true;
                }
            }

            if (matched) allMatchedIds.add(s.id);
        });
    });

    // Оновлення MD
    let mdContent = `# 🚀 Глобальний Аудит Мапінгу Фото\n\n`;
    
    mdContent += `## 📊 Загальна статистика\n`;
    mdContent += `| Показник | Значення |\n`;
    mdContent += `|---|---|\n`;
    mdContent += `| **Усього Secondary** | ${secondary.length} |\n`;
    mdContent += `| **Точне охоплення (Building)** | ${uniqueExactIds.size} (${((uniqueExactIds.size/secondary.length)*100).toFixed(1)}%) |\n`;
    mdContent += `| **Бета охоплення (Description)** | ${uniqueBetaIds.size} (${((uniqueBetaIds.size/secondary.length)*100).toFixed(1)}%) |\n`;
    mdContent += `| <span style="color:green">**Гео охоплення (Radius 50m)**</span> | **${uniqueGeoIds.size} (${((uniqueGeoIds.size/secondary.length)*100).toFixed(1)}%)** |\n`;
    mdContent += `| **СУМАРНЕ ОХОПЛЕННЯ** | **${allMatchedIds.size} (${((allMatchedIds.size/secondary.length)*100).toFixed(1)}%)** |\n\n`;

    mdContent += `### 🏷 Легенда:\n`;
    mdContent += `- **Знайдено (Building)**: Кількість за точною назвою будівлі.\n`;
    mdContent += `- <span style="color:red">**Бета (Description)**</span>: Кількість за назвою в описі.\n`;
    mdContent += `- <span style="color:green">**Гео (50m)**</span>: Кількість за локацією.\n\n`;

    mdContent += `| № | Назва проекту | Building | <span style="color:red">Beta</span> | <span style="color:green">Geo</span> |\n`;
    mdContent += `|---|---|---:|---:|---:|\n`;

    const sorted = projects.sort((a,b) => a.name.localeCompare(b.name));
    sorted.forEach((p, index) => {
        const build = exactMatchCounts[p.id] || 0;
        const beta = betaMatchCounts[p.id] || 0;
        const geo = geoMatchCounts[p.id] || 0;
        
        const buildL = build > 0 ? `**${build}**` : `0`;
        const betaL = beta > 0 ? `<span style="color:red">**${beta}**</span>` : `0`;
        const geoL = geo > 0 ? `<span style="color:green">**${geo}**</span>` : `0`;
        
        mdContent += `| ${index + 1} | ${p.name} | ${buildL} | ${betaL} | ${geoL} |\n`;
    });

    fs.writeFileSync('/Users/vytvytskyi/admin_for_you/off_plan_projects.md', mdContent);
    console.log(`✅ Гео-мапінг завершено. Файл off_plan_projects.md оновлено.`);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

geoMapping();
