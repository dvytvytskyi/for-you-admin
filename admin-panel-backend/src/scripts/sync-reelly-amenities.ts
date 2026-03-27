import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property } from '../entities/Property';
import { Facility } from '../entities/Facility';
import * as fs from 'fs';
import * as path from 'path';

// Normalize string for matching
function normalize(str: string): string {
    return (str || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

async function run() {
    try {
        console.log('🔄 Connecting to DB...');
        await AppDataSource.initialize();
        console.log('✅ Connected.');

        const propertyRepo = AppDataSource.getRepository(Property);
        const facilityRepo = AppDataSource.getRepository(Facility);

        // 1. Get all facilities for matching
        const allFacilities = await facilityRepo.find();
        const facilityMap = new Map<string, Facility>();
        allFacilities.forEach(f => {
            facilityMap.set(normalize(f.nameEn), f);
        });

        // 2. Load Reelly JSON
        const jsonPath = path.resolve(__dirname, '../../../reelly_all_projects.json');
        if (!fs.existsSync(jsonPath)) {
            console.error(`❌ File not found: ${jsonPath}`);
            return;
        }
        const projects = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`📊 Found ${projects.length} Reelly projects.`);

        // 3. Load our off-plan properties
        const dbProperties = await propertyRepo.find({
            where: { propertyType: 'off-plan' as any }
        });
        console.log(`📊 Found ${dbProperties.length} Off-Plan properties in DB.`);

        // Create a fast lookup for DB properties by name
        const dbPropMap = new Map<string, Property>();
        dbProperties.forEach(p => {
            dbPropMap.set(normalize(p.name), p);
        });

        let updatedCount = 0;

        // 4. Map facilities for each project
        for (const p of projects) {
            const dbProp = dbPropMap.get(normalize(p.name));
            if (!dbProp) continue;

            if (Array.isArray(p.facilities) && p.facilities.length > 0) {
                const matchedFacilities: Facility[] = [];
                for (const f of p.facilities) {
                    const fName = f.name || '';
                    if (!fName) continue;

                    // Manual mappings for Reelly names
                    let mappedName = fName;
                    if (fName.includes('Swimming Pool')) mappedName = 'Swimming Pool';
                    if (fName.includes('Gym')) mappedName = 'Gym';
                    if (fName.includes('Gardens')) mappedName = 'Private Garden';
                    if (fName.includes('Play Area')) mappedName = 'Kids Play Area';
                    if (fName.includes('BBQ')) mappedName = 'BBQ Area';
                    if (fName.includes('Parking')) mappedName = 'Parking';
                    if (fName.includes('Lobby')) mappedName = 'Lobby';
                    
                    const facility = facilityMap.get(normalize(mappedName));
                    if (facility) {
                        matchedFacilities.push(facility);
                    }
                }

                if (matchedFacilities.length > 0) {
                    // Filter duplicates
                    const uniqueFacilities = Array.from(new Map(matchedFacilities.map(f => [f.id, f])).values());
                    
                    // Update property facilities
                    dbProp.facilities = uniqueFacilities;
                    await propertyRepo.save(dbProp);
                    updatedCount++;
                    
                    if (updatedCount % 50 === 0) {
                        console.log(`⏳ Synced amenities for ${updatedCount} properties...`);
                    }
                }
            }
        }

        console.log(`\n✅ Successfully synced amenities for ${updatedCount} properties!`);
    } catch (e: any) {
        console.error('CRITICAL SYNC ERROR:', e);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

run();
