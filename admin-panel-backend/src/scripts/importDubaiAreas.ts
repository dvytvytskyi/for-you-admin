import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Country } from '../entities/Country';
import { City } from '../entities/City';
import { Area } from '../entities/Area';

const dubaiAreas = [
  "Al Aryam",
  "Al Barari",
  "Al Barsha",
  "Al Barsha First",
  "Al Barsha Second",
  "Al Barsha South Fifth",
  "Al Barsha South Fourth",
  "Al Barsha South Second",
  "Al Barsha South Third",
  "Al Corniche",
  "Al Furjan",
  "Al Hebiah Fifth",
  "Al Hebiah First",
  "Al Hebiah Fourth",
  "Al Hebiah Second",
  "Al Hebiah Third",
  "Al Jadaf",
  "Al Khairan First",
  "Al Kheeran",
  "Al Kifaf",
  "Al Merkadh",
  "Al Nahda First",
  "Al Nahda Second",
  "Al Quoz",
  "Al Quoz 2",
  "Al Quoz 4",
  "Al Safouh First",
  "Al Safouh Second",
  "Al Thanyah Fifth",
  "Al Thanyah First",
  "Al Thanyah Third",
  "Al Wasl",
  "Al Yelayiss 1",
  "Al Yelayiss 2",
  "Al Yelayiss 5",
  "Al Yufrah 1",
  "Al Yufrah 2",
  "Al Yufrah 3",
  "Arabian Ranches",
  "Arabian Ranches I",
  "Arjan",
  "Barsha Heights",
  "Bluewaters",
  "Bu Kadra",
  "Burj Khalifa",
  "Business Bay",
  "Cherrywoods",
  "City Walk",
  "City of Arabia",
  "Corniche Deira",
  "Damac Hills",
  "Damac Hills 2",
  "Damac Lagoons",
  "Deira",
  "Discovery Gardens",
  "Downtown Dubai",
  "Dubai Creek Harbour",
  "Dubai Design District",
  "Dubai Festival City",
  "Dubai Golf City",
  "Dubai Harbour",
  "Dubai Healthcare City Phase 2",
  "Dubai Hills",
  "Dubai Industrial City",
  "Dubai International City",
  "Dubai Internet City",
  "Dubai Investment Park",
  "Dubai Investment Park First",
  "Dubai Investment Park Second",
  "Dubai Islands",
  "Dubai Land",
  "Dubai Marina",
  "Dubai Media City",
  "Dubai Production City",
  "Dubai Science Park",
  "Dubai Silicon Oasis",
  "Dubai Sports City",
  "Dubai Studio City",
  "Falconcity of Wonders",
  "Hadaeq Sheikh Mohammed Bin Rashid",
  "International City",
  "Jabal Ali First",
  "Jabal Ali Industrial Second",
  "Jumeira Second",
  "Jumeirah",
  "Jumeirah Beach Residence (JBR)",
  "Jumeirah Gardens",
  "Jumeirah Island One",
  "Jumeirah Lake Towers (JLT)",
  "Jumeirah Lakes Towers",
  "Jumeirah Village Circle (JVC)",
  "Jumeirah Village Triangle (JVT)",
  "MJL (Madinat Jumeirah Living)",
  "Madinat Al Mataar",
  "Madinat Dubai Al Melaheyah",
  "Majan",
  "Maritime city",
  "Marsa Dubai",
  "Meydan",
  "Me´Aisem First",
  "Me´Aisem Second",
  "Mina Rashid",
  "Mirdif",
  "Mohammed Bin Rashid City (MBR)",
  "Motor City",
  "Nadd Al Shiba First",
  "Nadd Al Shiba Third",
  "Nadd Hessa",
  "Nakhlat Deira",
  "Nakhlat Jabal Ali",
  "Palm Jabal Ali",
  "Palm Jumeirah",
  "Port De La Mer",
  "Ras Al Khor Ind. First",
  "Remraam",
  "Saih Shuaib 2",
  "Sobha Hartland",
  "Sobha Hartland 2",
  "Sobha Reserve",
  "The Dubai International Financial Centre (DIFC)",
  "The Greens",
  "Tilal Al Ghaf",
  "Town Square",
  "Trade Center First",
  "Umm Suqeim",
  "Umm Suqeim First",
  "Umm Suqeim Second",
  "Umm Suqeim Third",
  "Uptown",
  "Wadi Al Safa 3",
  "Wadi Al Safa 4",
  "Wadi Al Safa 5",
  "Wadi Al Safa 6",
  "Wadi Al Safa 7",
  "Warsan Fourth",
  "Warsan Second",
  "World Islands",
  "Za'abeel",
  "Za´Abeel First",
  "Za´Abeel Second"
];

async function importDubaiAreas() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const countryRepository = AppDataSource.getRepository(Country);
    const cityRepository = AppDataSource.getRepository(City);
    const areaRepository = AppDataSource.getRepository(Area);

    // Find or create UAE country (search by code first, then by name)
    let uae = await countryRepository.findOne({ 
      where: { code: 'AE' } 
    });
    
    if (!uae) {
      uae = await countryRepository.findOne({ 
        where: { nameEn: 'UAE' } 
      });
    }
    
    if (!uae) {
      uae = countryRepository.create({ 
        nameEn: 'UAE',
        nameRu: 'ОАЭ',
        nameAr: 'الإمارات العربية المتحدة',
        code: 'AE' 
      });
      uae = await countryRepository.save(uae);
      console.log('✓ Created country: UAE');
    } else {
      console.log('✓ Found country: UAE');
    }

    // Find or create Dubai city
    let dubai = await cityRepository.findOne({ 
      where: { nameEn: 'Dubai', countryId: uae.id } 
    });
    
    if (!dubai) {
      dubai = cityRepository.create({ 
        nameEn: 'Dubai',
        nameRu: 'Дубай',
        nameAr: 'دبي',
        countryId: uae.id 
      });
      dubai = await cityRepository.save(dubai);
      console.log('✓ Created city: Dubai');
    } else {
      console.log('✓ Found city: Dubai');
    }

    console.log(`\n📊 Importing ${dubaiAreas.length} areas for Dubai...`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const areaName of dubaiAreas) {
      try {
        // Check if area already exists
        const existing = await areaRepository.findOne({ 
          where: { 
            nameEn: areaName.trim(),
            cityId: dubai.id
          } 
        });
        
        if (existing) {
          skippedCount++;
          console.log(`⊘ Skipped (exists): ${areaName}`);
          continue;
        }

        // Create new area
        const area = areaRepository.create({
          nameEn: areaName.trim(),
          nameRu: areaName.trim(),
          nameAr: areaName.trim(),
          cityId: dubai.id,
        });
        
        await areaRepository.save(area);
        console.log(`✓ Created: ${areaName}`);
        successCount++;
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Failed to import "${areaName}": ${error.message}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`⊘ Skipped (already exist): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    const finalCount = await areaRepository.count({ 
      where: { cityId: dubai.id } 
    });
    console.log(`\n📈 Total areas in Dubai: ${finalCount}`);

    await AppDataSource.destroy();
    console.log('✅ Done');
  } catch (error: any) {
    console.error('❌ Error importing Dubai areas:', error);
    process.exit(1);
  }
}

importDubaiAreas();

