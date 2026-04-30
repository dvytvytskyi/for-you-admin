import { DataSource, Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// --- Minimal Entities ---

export enum PropertyType {
    OFF_PLAN = 'off-plan',
    SECONDARY = 'secondary',
}

export enum UnitType {
    APARTMENT = 'apartment',
    PENTHOUSE = 'penthouse',
    VILLA = 'villa',
    TOWNHOUSE = 'townhouse',
    OFFICE = 'office',
}

@Entity('countries')
export class MinimalCountry {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column()
    nameEn!: string;
    @Column({ nullable: true })
    nameRu!: string;
    @Column({ nullable: true })
    nameAr!: string;
    @Column({ nullable: true })
    code!: string;
}

@Entity('cities')
export class MinimalCity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column()
    countryId!: string;
    @Column()
    nameEn!: string;
    @Column({ nullable: true })
    nameRu!: string;
    @Column({ nullable: true })
    nameAr!: string;
}

@Entity('areas')
export class MinimalArea {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column()
    cityId!: string;
    @Column()
    nameEn!: string;
    @Column({ nullable: true })
    nameRu!: string;
    @Column({ nullable: true })
    nameAr!: string;
}

@Entity('developers')
export class MinimalDeveloper {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column()
    name!: string;
    @Column({ nullable: true })
    description!: string;
    @Column({ nullable: true })
    logo!: string;
}

@Entity('facilities')
export class MinimalFacility {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column({ name: 'nameEn' })
    nameEn!: string; // Map to correct column
}

@Entity('properties')
export class MinimalProperty {
    @PrimaryColumn('uuid')
    id!: string;

    @Column({ type: 'enum', enum: PropertyType, default: PropertyType.OFF_PLAN })
    propertyType!: PropertyType;

    @Column()
    name!: string;

    @Column('simple-array')
    photos!: string[];

    @Column('decimal', { precision: 10, scale: 8 })
    latitude!: number;

    @Column('decimal', { precision: 11, scale: 8 })
    longitude!: number;

    @Column({ type: 'text', nullable: true })
    description!: string;

    @Column('decimal', { precision: 14, scale: 2, default: 0 })
    priceFrom!: number;

    @Column()
    countryId!: string;

    @Column()
    cityId!: string;

    @Column()
    areaId!: string;

    @Column({ nullable: true })
    developerId!: string;

    // Ranges
    @Column({ nullable: true })
    bedroomsFrom!: number;
    @Column({ nullable: true })
    bedroomsTo!: number;
    @Column({ nullable: true })
    bathroomsFrom!: number;
    @Column({ nullable: true })
    bathroomsTo!: number;
    @Column({ nullable: true, type: 'float' })
    sizeFrom!: number;
    @Column({ nullable: true, type: 'float' })
    sizeTo!: number;
    @Column({ type: 'text', nullable: true })
    paymentPlan!: string;
}

@Entity('property_units')
export class MinimalPropertyUnit {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
    @Column()
    propertyId!: string;
    @Column()
    unitId!: string;
    @Column({ type: 'enum', enum: UnitType })
    type!: UnitType;
    @Column('float')
    totalSize!: number;
    @Column('float', { nullable: true })
    balconySize!: number;
    @Column('decimal', { precision: 14, scale: 2 })
    price!: number;
    @Column({ nullable: true })
    planImage!: string;
}

// --- Script ---

interface CSVRow {
    id: string;
    propertyType: string;
    name: string;
    photos: string;
    countryId: string;
    countryName: string;
    cityId: string;
    cityName: string;
    areaId: string;
    areaName: string;
    latitude: string;
    longitude: string;
    description: string;
    developerId: string;
    developerName: string;
    priceFrom: string;
    bedroomsFrom: string;
    bedroomsTo: string;
    bathroomsFrom: string;
    bathroomsTo: string;
    sizeFrom: string;
    sizeTo: string;
    paymentPlan: string;
    price: string;
    bedrooms: string;
    bathrooms: string;
    size: string;
    facilities: string;
    units: string;
}

function mapUnitType(type: string): UnitType {
    const typeMap: { [key: string]: UnitType } = {
        'apartment': UnitType.APARTMENT,
        'penthouse': UnitType.PENTHOUSE,
        'villa': UnitType.VILLA,
        'townhouse': UnitType.TOWNHOUSE,
        'office': UnitType.OFFICE,
    };
    return typeMap[type.toLowerCase()] || UnitType.APARTMENT;
}

function mapPropertyType(type: string): PropertyType {
    if (type === 'off-plan') return PropertyType.OFF_PLAN;
    if (type === 'secondary') return PropertyType.SECONDARY;
    return PropertyType.OFF_PLAN;
}

async function startFullImport() {
    try {
        console.log('🔄 Connecting to database (Minimal Schema)...');

        const customDataSource = new DataSource({
            type: 'postgres',
            host: 'localhost',
            port: 5434,
            username: 'admin',
            password: process.env.DB_PASS ?? '',
            database: 'admin_panel',
            entities: [MinimalProperty, MinimalPropertyUnit, MinimalCountry, MinimalCity, MinimalArea, MinimalDeveloper, MinimalFacility],
            synchronize: false,
            logging: false,
        });

        await customDataSource.initialize();
        console.log('✅ Database connected');

        const propertyRepo = customDataSource.getRepository(MinimalProperty);
        const unitRepo = customDataSource.getRepository(MinimalPropertyUnit);
        const countryRepo = customDataSource.getRepository(MinimalCountry);
        const cityRepo = customDataSource.getRepository(MinimalCity);
        const areaRepo = customDataSource.getRepository(MinimalArea);
        const developerRepo = customDataSource.getRepository(MinimalDeveloper);
        const facilityRepo = customDataSource.getRepository(MinimalFacility);

        // Prepare facility join table helper (raw query)
        const addFacilityRelation = async (propId: string, facId: string) => {
            try {
                await customDataSource.query(
                    `INSERT INTO property_facilities_facilities ("propertiesId", "facilitiesId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [propId, facId]
                );
            } catch (e) { /* ignore */ }
        }

        // Read CSV file
        const possiblePaths = [
            path.resolve(__dirname, '../../../properties-full-export.csv'),
            path.resolve(process.cwd(), 'properties-full-export.csv'),
            '/app/properties-full-export.csv',
            path.join(process.cwd(), 'properties-full-export.csv')
        ];

        let csvPath: string | null = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                csvPath = p;
                break;
            }
        }

        if (!csvPath) {
            console.error(`CSV file not found.`);
            process.exit(1);
        }

        console.log(`📖 Reading CSV file: ${csvPath}...`);
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        console.log('🔄 Parsing CSV...');
        const records: CSVRow[] = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        console.log(`📊 Found ${records.length} records in CSV.`);

        let processed = 0;

        // Caching
        const countries = new Map<string, MinimalCountry>();
        const cities = new Map<string, MinimalCity>();
        const areas = new Map<string, MinimalArea>();
        const developers = new Map<string, MinimalDeveloper>();
        const facilities = new Map<string, MinimalFacility>();

        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            if (!row.name || !row.countryId) continue;

            try {
                // 1. Country
                let c = countries.get(row.countryId);
                if (!c) {
                    c = await countryRepo.findOne({ where: { id: row.countryId } }) || undefined;
                    if (!c && row.countryName) {
                        c = await countryRepo.findOne({ where: { nameEn: row.countryName } }) || undefined;
                        if (!c) {
                            c = countryRepo.create({
                                id: row.countryId,
                                nameEn: row.countryName,
                                nameRu: row.countryName, // Fallback
                                nameAr: row.countryName, // Fallback
                                code: row.countryName.substring(0, 2).toUpperCase()
                            });
                            await countryRepo.save(c);
                        }
                    }
                    if (c) countries.set(row.countryId, c);
                }
                if (!c) continue;

                // 2. City
                let city = cities.get(row.cityId);
                if (!city) {
                    city = await cityRepo.findOne({ where: { id: row.cityId } }) || undefined;
                    if (!city && row.cityName) {
                        city = await cityRepo.findOne({ where: { nameEn: row.cityName, countryId: c.id } }) || undefined;
                        if (!city) {
                            city = cityRepo.create({
                                id: row.cityId,
                                nameEn: row.cityName,
                                nameRu: row.cityName, // Fallback
                                nameAr: row.cityName, // Fallback
                                countryId: c.id
                            });
                            await cityRepo.save(city);
                        }
                    }
                    if (city) cities.set(row.cityId, city);
                }
                if (!city) continue;

                // 3. Area
                let area = areas.get(row.areaId);
                if (!area) {
                    area = await areaRepo.findOne({ where: { id: row.areaId } }) || undefined;
                    if (!area && row.areaName) {
                        area = await areaRepo.findOne({ where: { nameEn: row.areaName, cityId: city.id } }) || undefined;
                        if (!area) {
                            area = areaRepo.create({
                                id: row.areaId,
                                nameEn: row.areaName,
                                nameRu: row.areaName, // Fallback to avoid NotNull violation
                                nameAr: row.areaName, // Fallback
                                cityId: city.id
                            });
                            await areaRepo.save(area);
                        }
                    }
                    if (area) areas.set(row.areaId, area);
                }
                if (!area) continue;

                // 4. Developer
                let dev = developers.get(row.developerId);
                if (!dev && row.developerId) {
                    dev = await developerRepo.findOne({ where: { id: row.developerId } }) || undefined;
                    if (!dev && row.developerName) {
                        dev = developerRepo.create({ id: row.developerId, name: row.developerName });
                        await developerRepo.save(dev);
                    }
                    if (dev) developers.set(row.developerId, dev);
                }

                // 5. Property
                const photos = row.photos ? row.photos.split(';').filter(x => !!x.trim()) : [];
                let prop = await propertyRepo.findOne({ where: { id: row.id } });

                const propData = {
                    id: row.id,
                    propertyType: mapPropertyType(row.propertyType),
                    name: row.name,
                    photos,
                    latitude: parseFloat(row.latitude) || 0,
                    longitude: parseFloat(row.longitude) || 0,
                    description: row.description || '',
                    priceFrom: parseFloat(row.priceFrom || '0'),
                    countryId: c.id,
                    cityId: city.id,
                    areaId: area.id,
                    developerId: dev ? dev.id : null,
                    bedroomsFrom: row.bedroomsFrom ? parseInt(row.bedroomsFrom) : null,
                    bedroomsTo: row.bedroomsTo ? parseInt(row.bedroomsTo) : null,
                    bathroomsFrom: row.bathroomsFrom ? parseInt(row.bathroomsFrom) : null,
                    bathroomsTo: row.bathroomsTo ? parseInt(row.bathroomsTo) : null,
                    sizeFrom: row.sizeFrom ? parseFloat(row.sizeFrom) : null,
                    sizeTo: row.sizeTo ? parseFloat(row.sizeTo) : null,
                    paymentPlan: row.paymentPlan
                };

                if (!prop) {
                    // Ensure create returns single object 
                    // Using 'as any' to avoid TS errors about nulls in optional fields
                    const newProp = propertyRepo.create(propData as any);
                    prop = Array.isArray(newProp) ? newProp[0] : newProp;
                    await propertyRepo.save(prop);
                } else {
                    // Merge and save
                    Object.assign(prop, propData);
                    await propertyRepo.save(prop);
                }

                // 6. Facilities Relation
                if (row.facilities) {
                    const fParts = row.facilities.split(';');
                    for (const f of fParts) {
                        const m = f.match(/\(([a-f0-9-]+)\)/);
                        if (m && m[1]) {
                            // Check if facility exists in DB
                            let fac = facilities.get(m[1]);
                            if (!fac) {
                                fac = await facilityRepo.findOne({ where: { id: m[1] } }) || undefined;
                                if (fac) facilities.set(m[1], fac);
                            }
                            // If checking by name (minimal entity might map 'nameEn' column)
                            // The error was "column MinimalFacility.name does not exist". 
                            // It means the entity had 'name' property but DB has 'nameEn'.
                            // We fixed this in entity definition above.

                            if (fac) {
                                await addFacilityRelation(prop.id, fac.id);
                            }
                        }
                    }
                }

                // 7. Units
                if (row.units) {
                    try {
                        const units = JSON.parse(row.units);
                        if (Array.isArray(units)) {
                            for (const u of units) {
                                const uId = u.unitId || u.id;
                                if (!uId) continue;

                                let unit = await unitRepo.findOne({ where: { propertyId: prop.id, unitId: uId } });
                                const unitRaw = {
                                    propertyId: prop.id,
                                    unitId: uId,
                                    type: mapUnitType(u.type),
                                    planImage: u.planImage,
                                    totalSize: parseFloat(u.totalSize || 0),
                                    balconySize: parseFloat(u.balconySize || 0),
                                    price: parseFloat(u.price || 0)
                                };
                                if (!unit) {
                                    const newUnit = unitRepo.create(unitRaw);
                                    await unitRepo.save(Array.isArray(newUnit) ? newUnit[0] : newUnit);
                                } else {
                                    Object.assign(unit, unitRaw);
                                    await unitRepo.save(unit);
                                }
                            }
                        }
                    } catch (e) { }
                }

                processed++;
            } catch (e: any) {
                console.error(`Error ${row.name}:`, e.message);
            }

            if (i % 50 === 0) console.log(`Processing ${i}/${records.length}...`);
        }

        console.log(`✅ Full Import Done! Processed: ${processed}`);
        await customDataSource.destroy();

    } catch (error: any) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

startFullImport();
