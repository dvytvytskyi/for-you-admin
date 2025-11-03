import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { PropertyUnit, UnitType } from '../entities/PropertyUnit';
import { Country } from '../entities/Country';
import { City } from '../entities/City';
import { Area } from '../entities/Area';
import { Developer } from '../entities/Developer';
import * as fs from 'fs';
import * as path from 'path';

interface ParsedProperty {
  propertyType: string;
  name: string;
  photos: string[];
  latitude: number;
  longitude: number;
  description: string;
  priceFrom: number;
  bedroomsFrom: number;
  bedroomsTo: number;
  bathroomsFrom: number;
  bathroomsTo: number;
  sizeFrom: number;
  sizeTo: number;
  developerId?: string;
  developerName?: string;
  countryName: string;
  countryCode: string;
  cityName: string;
  areaName: string;
  units?: ParsedUnit[];
}

interface ParsedUnit {
  unitId: string;
  type: string;
  typeName?: string;
  bedrooms?: number | null;
  planImage?: string | null;
  totalSize: number;
  balconySize?: number | null;
  price: number;
}

interface ParsedData {
  properties: ParsedProperty[];
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

async function importProperties() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const propertyRepository = AppDataSource.getRepository(Property);
    const unitRepository = AppDataSource.getRepository(PropertyUnit);
    const countryRepository = AppDataSource.getRepository(Country);
    const cityRepository = AppDataSource.getRepository(City);
    const areaRepository = AppDataSource.getRepository(Area);
    const developerRepository = AppDataSource.getRepository(Developer);

    // Clear all existing properties and units first
    console.log('🧹 Cleaning database...');
    // Use raw SQL to delete with CASCADE
    await AppDataSource.query('TRUNCATE TABLE property_units CASCADE');
    await AppDataSource.query('TRUNCATE TABLE properties CASCADE');
    console.log('✅ Properties and units cleaned');
    
    // Clean up duplicate developers after clearing properties
    console.log('🧹 Cleaning duplicate developers...');
    await AppDataSource.query(`
      DELETE FROM developers
      WHERE id NOT IN (
        SELECT DISTINCT ON (LOWER(name)) id
        FROM developers
        ORDER BY LOWER(name), id
      )
    `);
    console.log('✅ Duplicates cleaned');

    // Read parsed.json file (from admin-panel-backend root)
    const jsonPath = path.resolve(__dirname, '../../parsed.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }
    let jsonContent = fs.readFileSync(jsonPath, 'utf-8').trim();
    // Fix formatting: if file starts with "properties", wrap it with braces
    if (jsonContent.startsWith('"properties"')) {
      // Check if it already ends with closing brace
      if (jsonContent.endsWith('}')) {
        jsonContent = '{' + jsonContent;
      } else if (jsonContent.endsWith(']')) {
        jsonContent = '{' + jsonContent + '}';
      } else {
        jsonContent = '{' + jsonContent + '}';
      }
    }
    // Remove space after opening brace if present
    jsonContent = jsonContent.replace(/^\{ /, '{');
    const parsedData: ParsedData = JSON.parse(jsonContent);

    console.log(`📊 Found ${parsedData.properties.length} properties to import`);

    // Cache for entities
    const countryCache = new Map<string, Country>();
    const cityCache = new Map<string, City>();
    const areaCache = new Map<string, Area>();
    const developerCache = new Map<string, Developer>();

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each property
    for (let i = 0; i < parsedData.properties.length; i++) {
      const parsedProperty = parsedData.properties[i];

      try {
        // Validate required fields
        if (!parsedProperty.name || !parsedProperty.photos || parsedProperty.photos.length === 0) {
          errors.push(`Property ${i + 1}: Missing required fields (name or photos)`);
          errorCount++;
          continue;
        }

        // Validate coordinates
        if (!parsedProperty.latitude || parsedProperty.latitude === 0 || 
            !parsedProperty.longitude || parsedProperty.longitude === 0) {
          console.warn(`⚠️  Property ${i + 1} (${parsedProperty.name}): Invalid coordinates, skipping...`);
          errorCount++;
          continue;
        }

        // Validate numeric fields
        if (parsedProperty.priceFrom === 0 || parsedProperty.priceFrom === undefined || parsedProperty.priceFrom === null) {
          console.warn(`⚠️  Property ${i + 1} (${parsedProperty.name}): Invalid priceFrom, skipping...`);
          errorCount++;
          continue;
        }

        // Get or create country
        let country = countryCache.get(parsedProperty.countryCode);
        if (!country) {
          const foundCountry = await countryRepository.findOne({ where: { code: parsedProperty.countryCode } });
          if (foundCountry) {
            country = foundCountry;
          } else {
            country = await countryRepository.save({
              nameEn: parsedProperty.countryName,
              nameRu: parsedProperty.countryName,
              nameAr: parsedProperty.countryName,
              code: parsedProperty.countryCode,
            });
            console.log(`   └─ Created country: ${parsedProperty.countryName}`);
          }
          countryCache.set(parsedProperty.countryCode, country);
        }

        // Get or create city
        const cityKey = `${country.id}_${parsedProperty.cityName}`;
        let city = cityCache.get(cityKey);
        if (!city) {
          const foundCity = await cityRepository.findOne({ where: { countryId: country.id, nameEn: parsedProperty.cityName } });
          if (foundCity) {
            city = foundCity;
          } else {
            city = await cityRepository.save({
              countryId: country.id,
              nameEn: parsedProperty.cityName,
              nameRu: parsedProperty.cityName,
              nameAr: parsedProperty.cityName,
            });
            console.log(`   └─ Created city: ${parsedProperty.cityName}`);
          }
          cityCache.set(cityKey, city);
        }

        // Get or create area
        const areaKey = `${city.id}_${parsedProperty.areaName}`;
        let area = areaCache.get(areaKey);
        if (!area) {
          const foundArea = await areaRepository.findOne({ where: { cityId: city.id, nameEn: parsedProperty.areaName } });
          if (foundArea) {
            area = foundArea;
          } else {
            area = await areaRepository.save({
              cityId: city.id,
              nameEn: parsedProperty.areaName,
              nameRu: parsedProperty.areaName,
              nameAr: parsedProperty.areaName,
            });
            console.log(`   └─ Created area: ${parsedProperty.areaName}`);
          }
          areaCache.set(areaKey, area);
        }

        // Get or create developer
        let developerId: string | undefined = undefined;
        if (parsedProperty.developerId) {
          let developer = developerCache.get(parsedProperty.developerId);
          if (!developer) {
            const foundDeveloper = await developerRepository.findOne({ where: { id: parsedProperty.developerId } });
            if (foundDeveloper) {
              developer = foundDeveloper;
            } else if (parsedProperty.developerName) {
              developer = await developerRepository.save({
                id: parsedProperty.developerId,
                name: parsedProperty.developerName,
              });
              console.log(`   └─ Created developer: ${parsedProperty.developerName}`);
            }
            if (developer) {
              developerCache.set(parsedProperty.developerId, developer);
              developerId = developer.id;
            }
          } else {
            developerId = developer.id;
          }
        } else if (parsedProperty.developerName) {
          // Try to find by name (case-insensitive)
          const existingDeveloper = await developerRepository.findOne({ 
            where: { name: parsedProperty.developerName },
          });
          if (existingDeveloper) {
            developerCache.set(existingDeveloper.id, existingDeveloper);
            developerId = existingDeveloper.id;
          } else {
            // Check cache for case-insensitive match
            let foundInCache = false;
            for (const [id, dev] of developerCache.entries()) {
              if (dev.name.toLowerCase() === parsedProperty.developerName.toLowerCase()) {
                developerId = id;
                foundInCache = true;
                break;
              }
            }
            if (!foundInCache) {
              // Create new developer
              try {
                const newDeveloper = await developerRepository.save({
                  name: parsedProperty.developerName,
                });
                developerCache.set(newDeveloper.id, newDeveloper);
                developerId = newDeveloper.id;
                console.log(`   └─ Created developer: ${parsedProperty.developerName}`);
              } catch (error: any) {
                // If unique constraint violation, try to find it again
                if (error.code === '23505') {
                  const found = await developerRepository.findOne({ 
                    where: { name: parsedProperty.developerName },
                  });
                  if (found) {
                    developerCache.set(found.id, found);
                    developerId = found.id;
                  }
                } else {
                  throw error;
                }
              }
            }
          }
        }

        // Create property entity
        const property = propertyRepository.create({
          propertyType: PropertyType.OFF_PLAN,
          name: parsedProperty.name,
          photos: parsedProperty.photos,
          countryId: country.id,
          cityId: city.id,
          areaId: area.id,
          latitude: parsedProperty.latitude,
          longitude: parsedProperty.longitude,
          description: parsedProperty.description || `Off-plan property: ${parsedProperty.name}`,
          developerId: developerId || undefined,
          priceFrom: parsedProperty.priceFrom,
          bedroomsFrom: parsedProperty.bedroomsFrom,
          bedroomsTo: parsedProperty.bedroomsTo,
          bathroomsFrom: parsedProperty.bathroomsFrom,
          bathroomsTo: parsedProperty.bathroomsTo,
          sizeFrom: parsedProperty.sizeFrom,
          sizeTo: parsedProperty.sizeTo,
        });

        // Save property
        const savedProperty = await propertyRepository.save(property);
        
        if ((i + 1) % 50 === 0 || i === 0) {
          console.log(`✅ [${i + 1}/${parsedData.properties.length}] Imported: ${savedProperty.name}`);
        }

        // Create units if they exist
        if (parsedProperty.units && parsedProperty.units.length > 0) {
          const units = parsedProperty.units.map((parsedUnit) => {
            const unit = unitRepository.create({
              propertyId: savedProperty.id,
              unitId: parsedUnit.unitId,
              type: mapUnitType(parsedUnit.type),
              planImage: parsedUnit.planImage || undefined,
              totalSize: parsedUnit.totalSize,
              balconySize: parsedUnit.balconySize || undefined,
              price: parsedUnit.price,
            });
            return unit;
          });

          await unitRepository.save(units);
          if ((i + 1) % 50 === 0 || i === 0) {
            console.log(`   └─ Created ${units.length} units`);
          }
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Property ${i + 1} (${parsedProperty.name}): ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('\n📈 Import Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n📋 First 20 errors:');
      errors.slice(0, 20).forEach(err => console.log(`   - ${err}`));
      if (errors.length > 20) {
        console.log(`   ... and ${errors.length - 20} more errors`);
      }
    }

    await AppDataSource.destroy();
    console.log('\n✅ Import completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the import
importProperties();