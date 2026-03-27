import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { PropertyUnit, UnitType } from '../entities/PropertyUnit';
import { Country } from '../entities/Country';
import { City } from '../entities/City';
import { Area } from '../entities/Area';
import { Developer } from '../entities/Developer';
import * as fs from 'fs';
import * as path from 'path';

function extractPhotos(project: any): string[] {
    const photos: string[] = [];
    
    // Helper to safely extract url
    const addPhoto = (item: any) => {
        if (!item) return;
        if (typeof item === 'string') {
            try {
                const parsed = JSON.parse(item);
                if (parsed.url) photos.push(parsed.url);
            } catch (e) {
                photos.push(item);
            }
        } else if (item.url) {
            photos.push(item.url);
        }
    };

    if (project.cover_image_url) addPhoto(project.cover_image_url);
    if (project.cover) addPhoto(project.cover);

    if (Array.isArray(project.architecture)) {
        project.architecture.forEach(addPhoto);
    }
    if (Array.isArray(project.interior)) {
        project.interior.forEach(addPhoto);
    }
    if (Array.isArray(project.lobby)) {
        project.lobby.forEach(addPhoto);
    }
    if (Array.isArray(project.facilities)) {
        project.facilities.forEach((f: any) => addPhoto(f.image));
    }
    if (Array.isArray(project.buildings)) {
        project.buildings.forEach((bArr: any) => {
            if (Array.isArray(bArr)) {
                bArr.forEach(b => {
                    if (Array.isArray(b.Building_image)) {
                        b.Building_image.forEach(addPhoto);
                    }
                });
            }
        });
    }

    return [...new Set(photos)];
}

async function run() {
    try {
        console.log('🔄 Connecting to DB...');
        await AppDataSource.initialize();
        console.log('✅ Connected.');

        const propertyRepo = AppDataSource.getRepository(Property);
        const countryRepo = AppDataSource.getRepository(Country);
        const cityRepo = AppDataSource.getRepository(City);
        const areaRepo = AppDataSource.getRepository(Area);
        const devRepo = AppDataSource.getRepository(Developer);

        // Path to JSON
        const jsonPath = path.resolve(__dirname, '../../../reelly_all_projects.json');
        if (!fs.existsSync(jsonPath)) {
            console.error(`❌ File not found: ${jsonPath}`);
            return;
        }

        console.log('📖 Reading JSON data...');
        const projects = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log(`📊 Found ${projects.length} projects to import.`);

        console.log('🗑️  Deleting existing Off-Plan properties and related favorites...');
        // Clear favorites first using raw SQL query
        await AppDataSource.query(`
            DELETE FROM favorites 
            WHERE "propertyId" IN (
                SELECT id FROM properties WHERE "propertyType" = 'off-plan'
            )
        `);
        // Now it's safe to drop off-plan properties
        await propertyRepo.delete({ propertyType: PropertyType.OFF_PLAN });
        console.log('✅ Deleted.');

        // Default UAE Country & Dubai City 
        let defaultCountry = await countryRepo.findOne({ where: { nameEn: 'United Arab Emirates' } });
        if (!defaultCountry) {
            defaultCountry = await countryRepo.save({
                nameEn: 'United Arab Emirates', nameRu: 'ОАЭ', nameAr: 'الإمارات العربية المتحدة', code: 'AE'
            });
        }

        let defaultCity = await cityRepo.findOne({ where: { nameEn: 'Dubai' } });
        if (!defaultCity) {
            defaultCity = await cityRepo.save({
                countryId: defaultCountry.id, nameEn: 'Dubai', nameRu: 'Дубай', nameAr: 'دبي'
            });
        }

        let importedCount = 0;

        for (const p of projects) {
            try {
                const name = p.name || 'Unknown Project';

                // Developer
                const devName = p.developer || (p.developer_data?.name) || 'Unknown Developer';
                let developer = await devRepo.findOne({ where: { name: devName } });
                if (!developer) {
                    developer = await devRepo.save({
                        name: devName,
                        logoUrl: p.developer_logo ? p.developer_logo : (p.developer_data?.logo_image?.[0]?.url || null)
                    });
                }

                // Area
                const areaName = p.area || 'Unknown Area';
                let area = await areaRepo.findOne({ where: { nameEn: areaName } });
                if (!area) {
                    area = await areaRepo.save({
                        cityId: defaultCity.id,
                        nameEn: areaName,
                        nameRu: areaName,
                        nameAr: areaName
                    });
                }

                // Coordinates
                let lat = 25.2048, lng = 55.2708; // Dubai default
                if (p.coordinates && typeof p.coordinates === 'string') {
                    const coords = p.coordinates.split(',').map((c: string) => parseFloat(c.trim()));
                    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                        lat = coords[0];
                        lng = coords[1];
                    }
                }

                const photos = extractPhotos(p);

                // Min/Max blocks processing logic
                let minBedrooms: number | null = null;
                let maxBedrooms: number | null = null;
                let minSize: number | null = null;
                let maxSize: number | null = null;

                if (Array.isArray(p.unit_blocks)) {
                    p.unit_blocks.forEach((u: any) => {
                        if (u.bedrooms !== null) {
                            const bd = Math.floor(parseFloat(u.bedrooms));
                            if (!isNaN(bd)) {
                                if (minBedrooms === null || bd < minBedrooms) minBedrooms = bd;
                                if (maxBedrooms === null || bd > maxBedrooms) maxBedrooms = bd;
                            }
                        }
                        if (u.units_area_from) {
                            const size = parseFloat(u.units_area_from);
                            if (!isNaN(size)) {
                                if (minSize === null || size < minSize) minSize = size;
                            }
                        }
                        if (u.units_area_to) {
                            const size = parseFloat(u.units_area_to);
                            if (!isNaN(size)) {
                                if (maxSize === null || size > maxSize) maxSize = size;
                            }
                        }
                    });
                }

                // Create property entity
                const property = new Property();
                property.propertyType = PropertyType.OFF_PLAN;
                property.name = name;
                property.description = p.overview || '';
                property.countryId = defaultCountry.id;
                property.cityId = defaultCity.id;
                property.areaId = area.id;
                property.developerId = developer.id;
                property.latitude = lat;
                property.longitude = lng;
                property.photos = photos;

                // Reelly Specific
                property.priceFrom = p.min_price_aed || p.min_price || 0;
                property.priceCurrency = p.price_currency || 'AED';
                property.bedroomsFrom = minBedrooms || 0;
                property.bedroomsTo = maxBedrooms || 0;
                property.sizeFrom = minSize || 0;
                property.sizeTo = maxSize || 0;
                property.status = p.status;
                property.saleStatus = p.sale_status;
                property.readiness = p.readiness;
                property.serviceCharge = p.service_charge;
                property.completionDatetime = p.completion_datetime;
                property.layoutsPdf = p.layouts_pdf;
                property.brochureUrl = p.brochure_url;
                property.depositDescription = p.deposit_description;
                property.videoUrl = p.video_url;
                property.mapPoints = p.map_points;
                property.paymentPlansJson = p.payment_plans;
                property.masterPlan = p.master_plan;
                property.lobby = p.lobby;
                property.interior = p.interior;
                property.architecture = p.architecture;

                // Sync facilities
                if (Array.isArray(p.facilities)) {
                    const facilityRepo = AppDataSource.getRepository('facilities');
                    const matchedFacilities: any[] = [];
                    for (const f of p.facilities) {
                        const fName = f.name || '';
                        if (!fName) continue;
                        
                        let mappedName = fName;
                        if (fName.includes('Swimming Pool')) mappedName = 'Swimming Pool';
                        if (fName.includes('Gym')) mappedName = 'Gym';
                        if (fName.includes('Gardens')) mappedName = 'Private Garden';
                        if (fName.includes('Play Area')) mappedName = 'Kids Play Area';
                        if (fName.includes('BBQ')) mappedName = 'BBQ Area';
                        if (fName.includes('Parking')) mappedName = 'Parking';
                        if (fName.includes('Lobby')) mappedName = 'Lobby';

                        const matched = await facilityRepo.findOne({ where: { nameEn: mappedName } });
                        if (matched) matchedFacilities.push(matched);
                    }
                    if (matchedFacilities.length > 0) {
                        property.facilities = Array.from(new Map(matchedFacilities.map(f => [f.id, f])).values());
                    }
                }

                await propertyRepo.save(property);
                importedCount++;

                if (importedCount % 50 === 0) {
                    console.log(`⏳ Imported ${importedCount}/${projects.length}`);
                }
            } catch (err: any) {
                console.error(`❌ Failed to import project ${p.name}:`, err.message);
            }
        }

        console.log(`\n✅ Successfully imported ${importedCount} Off-Plan properties from Reelly!`);
    } catch (e: any) {
        console.error('CRITICAL IMPORT ERROR:', e);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
        process.exit(0);
    }
}

run();
