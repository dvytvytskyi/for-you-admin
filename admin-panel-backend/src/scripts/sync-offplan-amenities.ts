import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { Facility } from '../entities/Facility';
import * as fs from 'fs';
import * as path from 'path';

const FACILITY_MAP: Record<string, string> = {
    'Swimming Pool': 'Swimming Pool',
    'Infinity Pool': 'Swimming Pool',
    'Kids Pool': 'Swimming Pool',
    'Swimming Pools': 'Swimming Pool',
    'Gym': 'Gym',
    'Gymnasium': 'Gym',
    'Outdoor Gym': 'Gym',
    'Indoor Gym': 'Gym',
    'Fully Equipped Gym': 'Gym',
    'Fitness Centre': 'Gym',
    'Fitness Studio': 'Gym',
    'Kids Play Area': 'Kids Play Area',
    'Children’S Play Area': 'Kids Play Area',
    'Kids’ Play Area': 'Kids Play Area',
    'Kids Play Areas': 'Kids Play Area',
    'Bbq Area': 'BBQ Area',
    'Barbeque Area': 'BBQ Area',
    'Bbq Areas': 'BBQ Area',
    'Outdoor Cinema': 'Cinema',
    'Cinema': 'Cinema',
    'Cinema Room': 'Cinema',
    'Jogging Track': 'Jogging Track',
    'Running Track': 'Jogging Track',
    'Clubhouse': 'Clubhouse',
    'Spa': 'Spa',
    'Sauna': 'Spa',
    'Jacuzzi': 'Spa',
    'Yoga Area': 'Yoga & Meditation',
    'Yoga Studio': 'Yoga & Meditation',
    'Zen Garden': 'Yoga & Meditation',
    'Basketball Court': 'Sports Facilities',
    'Tennis Court': 'Sports Facilities',
    'Padel Court': 'Sports Facilities',
    'Sports Courts': 'Sports Facilities',
    'Retail Outlets': 'Retail & Dining',
    'Cafe': 'Retail & Dining',
    'Restaurant': 'Retail & Dining',
    'Co-Working Space': 'Co-working Space',
    'Parking': 'Parking',
    'Security': '24/7 Security',
    'Concierge': 'Concierge',
    'Valet': 'Valet',
    'Private Garden': 'Gardens & Parks',
    'Lush Gardens': 'Gardens & Parks',
    'Library': 'Library'
};

async function run() {
    try {
        console.log('🔄 Connecting to DB...');
        await AppDataSource.initialize();
        console.log('✅ Connected.');

        const jsonPath = path.resolve(__dirname, '../../../reelly_all_projects.json');
        if (!fs.existsSync(jsonPath)) {
            console.error(`❌ File not found: ${jsonPath}`);
            return;
        }

        console.log('📖 Reading JSON data...');
        const projects = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const propertyRepo = AppDataSource.getRepository(Property);
        const facilityRepo = AppDataSource.getRepository(Facility);

        // Pre-fetch or create normalized facilities
        const normalizedFacilityNames = Array.from(new Set(Object.values(FACILITY_MAP)));
        const facilityMap = new Map<string, Facility>();

        for (const name of normalizedFacilityNames) {
            let facility = await facilityRepo.findOne({ where: { nameEn: name } });
            if (!facility) {
                facility = await facilityRepo.save({
                    nameEn: name,
                    nameRu: name, // Will be translated later
                    iconName: 'checkmark-circle'
                });
                console.log(`🆕 Created Facility: ${name}`);
            }
            facilityMap.set(name, facility);
        }

        console.log('🏗️ Processing relationships...');
        let updatedCount = 0;

        for (const pJson of projects) {
            const property = await propertyRepo.findOne({ 
                where: { name: pJson.name, propertyType: PropertyType.OFF_PLAN },
                relations: ['facilities']
            });

            if (!property) continue;

            const propertyFacilities: Facility[] = [];
            const seenNormalized = new Set<string>();

            if (pJson.facilities && Array.isArray(pJson.facilities)) {
                pJson.facilities.forEach((f: any) => {
                    const rawName = f.name;
                    if (rawName && FACILITY_MAP[rawName]) {
                        const normName = FACILITY_MAP[rawName];
                        if (!seenNormalized.has(normName)) {
                            const fac = facilityMap.get(normName);
                            if (fac) {
                                propertyFacilities.push(fac);
                                seenNormalized.add(normName);
                            }
                        }
                    }
                });
            }

            if (propertyFacilities.length > 0) {
                property.facilities = propertyFacilities;
                await propertyRepo.save(property);
                updatedCount++;
            }

            if (updatedCount % 100 === 0 && updatedCount > 0) {
                console.log(`⏳ Linked ${updatedCount} properties with amenities...`);
            }
        }

        console.log(`\n✨ Successfully synced amenities for ${updatedCount} Off-Plan properties!`);
    } catch (e: any) {
        console.error('❌ Error during sync:', e);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

run();
