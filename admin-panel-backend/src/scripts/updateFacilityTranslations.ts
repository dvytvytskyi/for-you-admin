import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Facility } from '../entities/Facility';
import { getFacilityTranslations } from '../utils/facilityTranslations';

async function updateFacilityTranslations() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const facilityRepository = AppDataSource.getRepository(Facility);
    const facilities = await facilityRepository.find();

    let updatedCount = 0;
    const updatedFacilities: string[] = [];

    for (const facility of facilities) {
      const translations = getFacilityTranslations(facility.nameEn?.trim() || '');
      const needUpdate =
        !facility.nameRu || facility.nameRu.trim() === '' || facility.nameRu.trim() === facility.nameEn?.trim() ||
        !facility.nameAr || facility.nameAr.trim() === '' || facility.nameAr.trim() === facility.nameEn?.trim();

      if (!needUpdate) continue;

      facility.nameRu = facility.nameRu && facility.nameRu.trim() !== '' && facility.nameRu.trim() !== facility.nameEn?.trim()
        ? facility.nameRu
        : translations.nameRu;
      facility.nameAr = facility.nameAr && facility.nameAr.trim() !== '' && facility.nameAr.trim() !== facility.nameEn?.trim()
        ? facility.nameAr
        : translations.nameAr;

      await facilityRepository.save(facility);
      updatedCount += 1;
      updatedFacilities.push(facility.nameEn);
      console.log(`✓ Updated facility '${facility.nameEn}' -> nameRu='${facility.nameRu}', nameAr='${facility.nameAr}'`);
    }

    console.log(`\n📈 Facility translation update complete. ${updatedCount} records updated.`);
    if (updatedFacilities.length > 0) {
      console.log('Updated facilities:', updatedFacilities.join(', '));
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error updating facility translations:', error?.message || error);
    process.exit(1);
  }
}

updateFacilityTranslations();
