import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import * as fs from 'fs';

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

function getKeywords(name: string): string[] {
    const stopWords = new Set(['the', 'residences', 'residence', 'at', 'dubai', 'apartment', 'apartments', 'villa', 'villas', 'tower', 'towers', 'building', 'by', 'of', 'and', 'with', 'in', 'near', 'from', 'a', 'an']);
    return name.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));
}

async function partialMapping() {
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

    const projects = offPlan.map(p => ({
        id: p.id,
        name: p.name.trim(),
        lowerName: p.name.trim().toLowerCase(),
        keywords: getKeywords(p.name),
        lat: Number(p.latitude),
        lng: Number(p.longitude)
    })).filter(p => p.name.length > 2);

    const exactCounts: Record<string, number> = {};
    const betaCounts: Record<string, number> = {};
    const geoCounts: Record<string, number> = {};
    const partialCounts: Record<string, number> = {};
    
    const uniqueExactIds = new Set<string>();
    const uniqueBetaIds = new Set<string>();
    const uniqueGeoIds = new Set<string>();
    const uniquePartialIds = new Set<string>();
    const allMatchedIds = new Set<string>();

    projects.forEach(p => {
        exactCounts[p.id] = 0; betaCounts[p.id] = 0; geoCounts[p.id] = 0; partialCounts[p.id] = 0;
    });

    secondary.forEach(s => {
        const sLat = Number(s.latitude);
        const sLng = Number(s.longitude);
        const sBuilding = (s.buildingName || '').toLowerCase().trim();
        const sDesc = (s.description || '').toLowerCase();
        let matchedSomething = false;

        projects.forEach(p => {
            let matchesThisProject = false;
            // 1. Exact
            if (sBuilding && sBuilding === p.lowerName) {
                exactCounts[p.id]++; uniqueExactIds.add(s.id); matchesThisProject = true;
            }
            // 2. Beta
            if (sDesc.includes(p.lowerName)) {
                betaCounts[p.id]++; uniqueBetaIds.add(s.id); matchesThisProject = true;
            }
            // 3. Geo
            if (sLat && sLng && p.lat && p.lng && getDistance(sLat, sLng, p.lat, p.lng) <= 50) {
                geoCounts[p.id]++; uniqueGeoIds.add(s.id); matchesThisProject = true;
            }
            // 4. Partial Keywords Match (Minimum 2 keywords must match, or 1 if it's the only one)
            if (p.keywords.length > 0) {
                const matchedKeywords = p.keywords.filter(kw => sDesc.includes(kw) || sBuilding.includes(kw));
                if (p.keywords.length >= 2 && matchedKeywords.length >= 2) {
                    partialCounts[p.id]++; uniquePartialIds.add(s.id); matchesThisProject = true;
                } else if (p.keywords.length === 1 && matchedKeywords.length === 1 && p.keywords[0].length > 4) {
                    // Only match single keyword IF it's long and unique (e.g. 'Clearpoint')
                    partialCounts[p.id]++; uniquePartialIds.add(s.id); matchesThisProject = true;
                }
            }

            if (matchesThisProject) { matchedSomething = true; allMatchedIds.add(s.id); }
        });
    });

    // Оновлення MD файлу
    let mdContent = `# 🚀 Глобальний Аудит Мапінгу Фото\n\n`;
    mdContent += `## 📊 Загальна статистика\n`;
    mdContent += `| Показник | Значення |\n|---|---|\n`;
    mdContent += `| **Усього Secondary** | ${secondary.length} |\n`;
    mdContent += `| **Точне охоплення (Building)** | ${uniqueExactIds.size} (${((uniqueExactIds.size/secondary.length)*100).toFixed(1)}%) |\n`;
    mdContent += `| **Бета охоплення (Description)** | ${uniqueBetaIds.size} (${((uniqueBetaIds.size/secondary.length)*100).toFixed(1)}%) |\n`;
    mdContent += `| <span style="color:green">**Гео охоплення (Radius 50m)**</span> | ${uniqueGeoIds.size} (${((uniqueGeoIds.size/secondary.length)*100).toFixed(1)}%) |\n`;
    mdContent += `| <span style="color:blue">**Часткове охоплення (Keywords)**</span> | **${uniquePartialIds.size} (${((uniquePartialIds.size/secondary.length)*100).toFixed(1)}%)** |\n`;
    mdContent += `| **СУМАРНЕ ОХОПЛЕННЯ** | **${allMatchedIds.size} (${((allMatchedIds.size/secondary.length)*100).toFixed(1)}%)** |\n\n`;

    mdContent += `### 🏷 Легенда:\n- **Building**: Точна назва будівлі\n- <span style="color:red">**Beta**</span>: Повна назва в описі\n- <span style="color:green">**Geo**</span>: Координати (50м)\n- <span style="color:blue">**Partial**</span>: Частковий збіг ключових слів\n\n`;
    mdContent += `| № | Назва проекту | Build | <span style="color:red">Beta</span> | <span style="color:green">Geo</span> | <span style="color:blue">Partial</span> |\n`;
    mdContent += `|---|---|---:|---:|---:|---:|\n`;

    const sorted = projects.sort((a,b) => a.name.localeCompare(b.name));
    sorted.forEach((p, i) => {
        const buildL = exactCounts[p.id] > 0 ? `**${exactCounts[p.id]}**` : `0`;
        const betaL = betaCounts[p.id] > 0 ? `<span style="color:red">**${betaCounts[p.id]}**</span>` : `0`;
        const geoL = geoCounts[p.id] > 0 ? `<span style="color:green">**${geoCounts[p.id]}**</span>` : `0`;
        const partL = partialCounts[p.id] > 0 ? `<span style="color:blue">**${partialCounts[p.id]}**</span>` : `0`;
        mdContent += `| ${i + 1} | ${p.name} | ${buildL} | ${betaL} | ${geoL} | ${partL} |\n`;
    });

    fs.writeFileSync('/Users/vytvytskyi/admin_for_you/off_plan_projects.md', mdContent);
    console.log(`✅ Частковий мапінг завершено. Таблицю оновлено.`);

  } catch (err) { console.error(err); } finally { process.exit(0); }
}

partialMapping();
