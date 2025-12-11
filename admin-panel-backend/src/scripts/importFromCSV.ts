import { AppDataSource } from '../config/database';
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

// Map unit type strings to enum
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
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const propertyRepository = AppDataSource.getRepository(Property);
    const unitRepository = AppDataSource.getRepository(PropertyUnit);
    const countryRepository = AppDataSource.getRepository(Country);
    const cityRepository = AppDataSource.getRepository(City);
    const areaRepository = AppDataSource.getRepository(Area);
    const developerRepository = AppDataSource.getRepository(Developer);
    const facilityRepository = AppDataSource.getRepository(Facility);

    // Read CSV file
    const possiblePaths = [
      path.resolve(__dirname, '../../../properties-full-export.csv'),
      path.resolve(process.cwd(), 'properties-full-export.csv'),
      '/app/properties-full-export.csv',
      path.join(process.cwd(), 'properties-full-export.csv'),
    ];

    let csvPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        csvPath = possiblePath;
        break;
      }
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

    // Cache for entities
    const countryCache = new Map<string, Country>();
    const cityCache = new Map<string, City>();
    const areaCache = new Map<string, Area>();
    const developerCache = new Map<string, Developer>();
    const facilityCache = new Map<string, Facility>();

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each property
    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      try {
        // Parse photos
        const photos = row.photos ? row.photos.split(';').filter(p => p.trim()) : [];
        
        if (!row.name || photos.length === 0) {
          errors.push(`Property ${i + 1}: Missing required fields (name or photos)`);
          errorCount++;
          continue;
        }

        // Parse coordinates
        const latitude = parseFloat(row.latitude);
        const longitude = parseFloat(row.longitude);
        
        if (!latitude || latitude === 0 || !longitude || longitude === 0) {
          console.warn(`⚠️  Property ${i + 1} (${row.name}): Invalid coordinates, skipping...`);
          errorCount++;
          continue;
        }

        // Parse price
        const priceFrom = parseFloat(row.priceFrom);
        if (!priceFrom || priceFrom === 0) {
          console.warn(`⚠️  Property ${i + 1} (${row.name}): Invalid priceFrom, skipping...`);
          errorCount++;
          continue;
        }

        // Get or create country
        let country = countryCache.get(row.countryId);
        if (!country) {
          country = await countryRepository.findOne({ where: { id: row.countryId } }) || undefined;
          if (!country) {
            // Try to find by name or create new
            const existingCountry = await countryRepository.findOne({ 
              where: { nameEn: row.countryName } 
            });
            if (existingCountry) {
              country = existingCountry;
            } else {
              country = countryRepository.create({
                id: row.countryId,
                nameEn: row.countryName,
                nameRu: row.countryName,
                nameAr: row.countryName,
                code: row.countryName.substring(0, 2).toUpperCase(),
              });
              country = await countryRepository.save(country);
            }
          }
          if (country) {
            countryCache.set(row.countryId, country);
          }
        }

        if (!country) {
          errors.push(`Property ${i + 1} (${row.name}): Country not found`);
          errorCount++;
          continue;
        }

        // Get or create city
        let city = cityCache.get(row.cityId);
        if (!city) {
          city = await cityRepository.findOne({ where: { id: row.cityId } }) || undefined;
          if (!city) {
            const existingCity = await cityRepository.findOne({ 
              where: { nameEn: row.cityName, countryId: country.id } 
            });
            if (existingCity) {
              city = existingCity;
            } else {
              city = cityRepository.create({
                id: row.cityId,
                nameEn: row.cityName,
                nameRu: row.cityName,
                nameAr: row.cityName,
                countryId: country.id,
              });
              city = await cityRepository.save(city);
            }
          }
          if (city) {
            cityCache.set(row.cityId, city);
          }
        }

        if (!city) {
          errors.push(`Property ${i + 1} (${row.name}): City not found`);
          errorCount++;
          continue;
        }

        // Get or create area
        let area = areaCache.get(row.areaId);
        if (!area) {
          area = await areaRepository.findOne({ where: { id: row.areaId } }) || undefined;
          if (!area) {
            const existingArea = await areaRepository.findOne({ 
              where: { nameEn: row.areaName, cityId: city.id } 
            });
            if (existingArea) {
              area = existingArea;
            } else {
              area = areaRepository.create({
                id: row.areaId,
                nameEn: row.areaName,
                nameRu: row.areaName,
                nameAr: row.areaName,
                cityId: city.id,
              });
              area = await areaRepository.save(area);
            }
          }
          if (area) {
            areaCache.set(row.areaId, area);
          }
        }

        if (!area) {
          errors.push(`Property ${i + 1} (${row.name}): Area not found`);
          errorCount++;
          continue;
        }

        // Get or create developer
        let developer: Developer | null = null;
        if (row.developerId && row.developerId.trim()) {
          developer = developerCache.get(row.developerId) || null;
          if (!developer) {
            developer = await developerRepository.findOne({ where: { id: row.developerId } }) || null;
            if (!developer && row.developerName && row.developerName.trim()) {
              developer = developerRepository.create({
                id: row.developerId,
                name: row.developerName,
                logo: null,
                description: null,
              });
              developer = await developerRepository.save(developer);
            }
            if (developer) {
              developerCache.set(row.developerId, developer);
            }
          }
        }

        // Parse facilities
        const facilityIds: string[] = [];
        if (row.facilities && row.facilities.trim()) {
          const facilityStrings = row.facilities.split(';');
          for (const facilityStr of facilityStrings) {
            const match = facilityStr.match(/\(([a-f0-9-]+)\)/);
            if (match && match[1]) {
              const facilityId = match[1];
              let facility = facilityCache.get(facilityId);
              if (!facility) {
                facility = await facilityRepository.findOne({ where: { id: facilityId } }) || undefined;
                if (facility) {
                  facilityCache.set(facilityId, facility);
                  facilityIds.push(facilityId);
                }
              } else {
                facilityIds.push(facilityId);
              }
            }
          }
        }

        // Create property
        let property = await propertyRepository.findOne({ where: { id: row.id } });
        if (!property) {
          property = propertyRepository.create({
            propertyType: mapPropertyType(row.propertyType),
            name: row.name,
            photos: photos,
            latitude: latitude,
            longitude: longitude,
            description: row.description || '',
          priceFrom: priceFrom,
          bedroomsFrom: row.bedroomsFrom ? parseInt(row.bedroomsFrom) : undefined,
          bedroomsTo: row.bedroomsTo ? parseInt(row.bedroomsTo) : undefined,
          bathroomsFrom: row.bathroomsFrom ? parseInt(row.bathroomsFrom) : undefined,
          bathroomsTo: row.bathroomsTo ? parseInt(row.bathroomsTo) : undefined,
          sizeFrom: row.sizeFrom ? parseFloat(row.sizeFrom) : undefined,
          sizeTo: row.sizeTo ? parseFloat(row.sizeTo) : undefined,
          paymentPlan: row.paymentPlan || undefined,
            countryId: country.id,
            cityId: city.id,
            areaId: area.id,
            developerId: developer?.id || null,
            facilities: facilityIds,
          });
          // Set id manually after creation
          (property as any).id = row.id;
        } else {
          // Update existing
          property.propertyType = mapPropertyType(row.propertyType);
          property.name = row.name;
          property.photos = photos;
          property.latitude = latitude;
          property.longitude = longitude;
          property.description = row.description || '';
          property.priceFrom = priceFrom;
          property.bedroomsFrom = row.bedroomsFrom ? parseInt(row.bedroomsFrom) : undefined;
          property.bedroomsTo = row.bedroomsTo ? parseInt(row.bedroomsTo) : undefined;
          property.bathroomsFrom = row.bathroomsFrom ? parseInt(row.bathroomsFrom) : undefined;
          property.bathroomsTo = row.bathroomsTo ? parseInt(row.bathroomsTo) : undefined;
          property.sizeFrom = row.sizeFrom ? parseFloat(row.sizeFrom) : undefined;
          property.sizeTo = row.sizeTo ? parseFloat(row.sizeTo) : undefined;
          property.paymentPlan = row.paymentPlan || undefined;
          property.countryId = country.id;
          property.cityId = city.id;
          property.areaId = area.id;
          property.developerId = developer?.id || undefined;
        }
        
        // Load facilities if needed  
        let facilityEntities: Facility[] = [];
        if (facilityIds.length > 0) {
          facilityEntities = await facilityRepository.find({
            where: facilityIds.map(id => ({ id }))
          });
        }
        property.facilities = facilityEntities;

        const savedProperty = await propertyRepository.save(property);
        
        // Ensure savedProperty is a single object, not an array
        const propertyId = Array.isArray(savedProperty) ? savedProperty[0]?.id : savedProperty.id;
        if (!propertyId) {
          throw new Error('Failed to save property');
        }

        // Parse and create units
        if (row.units && row.units.trim()) {
          try {
            const unitsData = JSON.parse(row.units);
            if (Array.isArray(unitsData)) {
              for (const unitData of unitsData) {
                const unitId = String(unitData.unitId || unitData.id || '');
                let unit = await unitRepository.findOne({ 
                  where: { propertyId: propertyId, unitId: unitId } 
                });
                
                const totalSize = unitData.totalSize ? parseFloat(String(unitData.totalSize)) : 0;
                const price = unitData.price ? parseFloat(String(unitData.price)) : 0;
                const balconySize = unitData.balconySize ? parseFloat(String(unitData.balconySize)) : 0;
                const planImage = unitData.planImage || null;
                
                if (!unit) {
                  unit = unitRepository.create({
                    propertyId: propertyId,
                    unitId: unitId,
                    type: mapUnitType(unitData.type || 'apartment'),
                    planImage: planImage,
                    totalSize: totalSize,
                    balconySize: balconySize,
                    price: price,
                  });
                } else {
                  unit.type = mapUnitType(unitData.type || 'apartment');
                  unit.planImage = planImage;
                  unit.totalSize = totalSize;
                  unit.balconySize = balconySize;
                  unit.price = price;
                }
                await unitRepository.save(unit);
              }
            }
          } catch (parseError) {
            console.warn(`⚠️  Property ${i + 1} (${row.name}): Failed to parse units JSON`);
          }
        }

        successCount++;
        if (successCount % 100 === 0) {
          console.log(`✅ Processed ${successCount}/${records.length} properties...`);
        }
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Property ${i + 1} (${row.name}): ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('\n📊 Import Statistics:');
    console.log(`   ✅ Successfully imported: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📈 Success rate: ${((successCount / records.length) * 100).toFixed(2)}%`);

    if (errors.length > 0 && errors.length <= 20) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`   • ${err}`));
    } else if (errors.length > 20) {
      console.log(`\n❌ First 20 errors (total ${errors.length}):`);
      errors.slice(0, 20).forEach(err => console.log(`   • ${err}`));
    }

    console.log('\n✅ Import completed!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importFromCSV();
