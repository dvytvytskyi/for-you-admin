import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';
import { PropertyFinderProject } from '../entities/PropertyFinderProject';

async function remapPhotos() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const propertyRepo = AppDataSource.getRepository(Property);
    const pfRepo = AppDataSource.getRepository(PropertyFinderProject);

    // 1. Отримуємо всі "чисті" проекти з Property Finder (Off-plan)
    const pfProjects = await pfRepo.find();
    console.log(`📊 Found ${pfProjects.length} Property Finder projects to map from.`);

    // 2. Отримуємо вторинні об'єкти, які мають "підозрілі" фото або потребують оновлення
    // Ми беремо ті, що мають reelly.io фото або пусті фото
    const secondaryProperties = await propertyRepo.createQueryBuilder('p')
      .where('p.propertyType = :type', { type: PropertyType.SECONDARY })
      .getMany();

    console.log(`🔍 Checking ${secondaryProperties.length} secondary properties for mapping.`);

    let mappedCount = 0;
    let fallbackCount = 0;

    for (const prop of secondaryProperties) {
      let foundPfProject = null;

      // Спроба 1: Мапінг по parentProjectId, якщо він вже є
      if (prop.parentProjectId) {
        foundPfProject = pfProjects.find(pf => pf.id === prop.parentProjectId);
      }

      // Спроба 2: Пошук назви проекту в дескрипшені або назві
      if (!foundPfProject) {
        for (const pf of pfProjects) {
          const pfName = (typeof pf.title === 'string' ? pf.title : (pf.title?.en || pf.title?.en_custom || '')).toLowerCase();
          if (pfName.length < 3) continue;

          const desc = (prop.description || '').toLowerCase();
          const name = (prop.name || '').toLowerCase();

          if (desc.includes(pfName) || name.includes(pfName)) {
            foundPfProject = pf;
            break;
          }
        }
      }

      // 3. Якщо знайшли відповідний проект - оновлюємо фото
      if (foundPfProject) {
        let newPhotos: string[] = [];
        
        // Витягуємо фото з fullData проекту
        const fd = foundPfProject.fullData || {};
        if (fd.media?.images && Array.isArray(fd.media.images)) {
          newPhotos = fd.media.images
            .map((img: any) => img.original?.url || img.watermarked?.url)
            .filter(Boolean);
        }

        // Якщо в масиві пусто, але є coverImage
        if (newPhotos.length === 0 && foundPfProject.coverImage) {
          newPhotos = [foundPfProject.coverImage];
        }

        if (newPhotos.length > 0) {
          prop.photos = newPhotos;
          prop.parentProjectId = foundPfProject.id;
          await propertyRepo.save(prop);
          mappedCount++;
          if (mappedCount % 100 === 0) console.log(`... mapped ${mappedCount} properties`);
        }
      } else {
          // Якщо нічого не знайшли, і це один із тих "підозрілих" об'єктів з reelly фото,
          // ми їх не видаляємо, але позначаємо для себе
          fallbackCount++;
      }
    }

    console.log(`✅ Mapping finished!`);
    console.log(`✨ Successfully remapped photos for ${mappedCount} properties using Off-plan data.`);
    console.log(`ℹ️ ${fallbackCount} properties remained with original photos (no match found).`);

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Mapping failed:', error);
    process.exit(1);
  }
}

remapPhotos();
