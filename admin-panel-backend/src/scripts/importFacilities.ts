import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Facility } from '../entities/Facility';
import { getFacilityTranslations } from '../utils/facilityTranslations';

interface AmenityData {
  ru: string;
  en: string;
  ar: string;
}

const amenitiesData: AmenityData[] = [
  { ru: "Общий бассейн", en: "Shared Pool", ar: "بركة مشتركه" },
  { ru: "Консьерж-сервис", en: "Concierge Service", ar: "خدمة الكونسيرج" },
  { ru: "Охрана", en: "Security", ar: "حماية" },
  { ru: "Лобби", en: "Lobby", ar: "ردهة" },
  { ru: "Центральный кондиционер и отопление", en: "Central A/C & Heating", ar: "تدفئة وتكييف مركزي" },
  { ru: "Крытый паркинг", en: "Covered Parking", ar: "مواقف مغطاة للسيارات" },
  { ru: "Общее джакузи", en: "Shared Jacuzzi", ar: "جاكوزي مشترك" },
  { ru: "Общий SPA", en: "Shared SPA", ar: "صالون سبا مشترك" },
  { ru: "Детский бассейн", en: "Children's pool", ar: "حمام سباحة للأطفال" },
  { ru: "Домашние животные разрешены", en: "Pets Allowed", ar: "مسموح بدخول الحيوانات الأليفة" },
  { ru: "Широкополосный Интернет", en: "Broadband Internet", ar: "الإنترنت ذات النطاق العريض" },
  { ru: "Банкоматы", en: "ATM Facility", ar: "مرفق أجهزة الصراف الآلي" },
  { ru: "Прачечная", en: "Laundry Room", ar: "غسيل" },
  { ru: "Переговорное устройство", en: "Intercom", ar: "انتركم" },
  { ru: "Детская игровая площадка", en: "Kids Play Area", ar: "منطقة لعب الأطفال" },
  { ru: "Складские помещения", en: "Storage Areas", ar: "مناطق التخزين" },
  { ru: "Доступность для людей с ограничениями", en: "Facilities for Disabled (accessibility)", ar: "مرافق لذوي الاحتياجات الخاصة (سهولة الوصول)" },
  { ru: "Зарядка для электроавтомобиля", en: "Electric Car Charger", ar: "شاحن سيارة كهربائي" },
];

async function importFacilities() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const facilityRepository = AppDataSource.getRepository(Facility);
    
    console.log(`📊 Importing ${amenitiesData.length} facilities...`);

    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const amenity of amenitiesData) {
      try {
        // Check if facility already exists (by English name)
        const existing = await facilityRepository.findOne({ 
          where: { nameEn: amenity.en.trim() } 
        });
        
        if (existing) {
          skippedCount++;
          console.log(`⊘ Skipped (exists): ${amenity.en}`);
          continue;
        }

        // Generate icon name from English name (lowercase, spaces to dashes)
        const iconName = amenity.en
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        const translations = getFacilityTranslations(amenity.en.trim());

        // Create new facility
        const facility = facilityRepository.create({
          nameEn: amenity.en.trim(),
          nameRu: amenity.ru.trim() || translations.nameRu,
          nameAr: amenity.ar.trim() || translations.nameAr,
          iconName: iconName,
        });
        
        await facilityRepository.save(facility);
        console.log(`✓ Created: ${amenity.en}`);
        successCount++;
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Failed to import "${amenity.en}": ${error.message}`;
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

    const finalCount = await facilityRepository.count();
    console.log(`\n📈 Total facilities in database: ${finalCount}`);

    await AppDataSource.destroy();
    console.log('✅ Done');
  } catch (error: any) {
    console.error('❌ Error importing facilities:', error);
    process.exit(1);
  }
}

importFacilities();

