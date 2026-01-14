import { DataSource } from 'typeorm'; // Import directly, don't rely on AppDataSource
import { Property, PropertyType } from '../entities/Property';
import { PropertyUnit, UnitType } from '../entities/PropertyUnit';
import { Country } from '../entities/Country';
import { City } from '../entities/City';
import { Area } from '../entities/Area';
import { Developer } from '../entities/Developer';
import { Facility } from '../entities/Facility';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

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
    createdAt: string;
    updatedAt: string;
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

async function importFromCSV() {
    try {
        console.log('🔄 Connecting to database (Custom Safe Connection)...');

        const customDataSource = new DataSource({
            type: 'postgres',
            host: 'localhost', // Hardcoded safe defaults for this script
            port: 5434,
            username: 'admin',
            password: 'admin123',
            database: 'admin_panel',
            entities: [Property, PropertyUnit, Country, City, Area, Developer, Facility],
            synchronize: false, // DISABLED to prevent schema corruption
            logging: false,
        });

        await customDataSource.initialize();
        console.log('✅ Database connected');

        const propertyRepository = customDataSource.getRepository(Property);

        // Read CSV file
        const possiblePaths = [
            path.resolve(__dirname, '../../../properties-full-export.csv'),
            path.resolve(process.cwd(), 'properties-full-export.csv'),
            '/app/properties-full-export.csv',
            path.join(process.cwd(), 'properties-full-export.csv'),
            path.join(__dirname, '../../properties-full-export.csv'),
            path.join(__dirname, '../properties-full-export.csv')
        ];

        let csvPath: string | null = null;
        for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
                csvPath = possiblePath;
                break;
            }
        }

        if (!csvPath) {
            // Fallback
            const rootPath = '/Users/vytvytskyi/admin_for_you/admin-panel-backend/properties-full-export.csv';
            if (fs.existsSync(rootPath)) csvPath = rootPath;
        }

        if (!csvPath) {
            throw new Error(`CSV file not found. Tried: ${possiblePaths.join(', ')}`);
        }

        console.log(`📖 Reading CSV file: ${csvPath}...`);
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        console.log('🔄 Parsing CSV...');
        const records: CSVRow[] = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        console.log(`📊 Found ${records.length} properties to import\n`);

        let successCount = 0;
        let errorCount = 0;

        // Create a normalized map of Name -> Row for faster lookup if helpful, 
        // but here we iterate CSV and query DB.

        const BATCH_SIZE = 50;
        const allDbProperties = await propertyRepository.find({ select: ['id', 'name'] });
        console.log(`Loaded ${allDbProperties.length} properties from DB for matching.`);

        // Create Map for fast lookup
        const dbPropMap = new Map<string, Property>();
        // Store by ID
        for (const p of allDbProperties) dbPropMap.set(p.id, p);
        // Store by Name (lower case for loose matching)
        const dbPropNameMap = new Map<string, Property>();
        for (const p of allDbProperties) dbPropNameMap.set(p.name.trim().toLowerCase(), p);

        // Process each property
        for (let i = 0; i < records.length; i++) {
            const row = records[i];

            try {
                const photos = row.photos ? row.photos.split(';').filter(p => p.trim()) : [];

                if (!row.name) {
                    errorCount++;
                    continue;
                }

                // 1. Try Match by ID
                let property = dbPropMap.get(row.id);

                // 2. Try Match by Name
                if (!property) {
                    property = dbPropNameMap.get(row.name.trim().toLowerCase());
                }

                if (property) {
                    // We found a match! Update photos immediately (or batch if we refined this)
                    // Need to re-fetch full entity or just update?
                    // Just update directly using update() to be faster and avoid relation issues
                    await propertyRepository.update(property.id, { photos: photos });
                    successCount++;
                } else {
                    // Still not found
                    // console.log(`Skipping ${row.name} (not found in DB)`);
                    continue;
                }
            } catch (e) {
                errorCount++;
            }

            if (i % 250 === 0) console.log(`Processed ${i}/${records.length}`);
        }

        console.log(`\nUpdated photos for ${successCount} properties.`);
        await customDataSource.destroy();

    } catch (error: any) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

importFromCSV();
