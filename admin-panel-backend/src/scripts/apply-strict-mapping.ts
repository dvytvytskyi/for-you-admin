
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Property, PropertyType } from '../entities/Property';

/**
 * STRICT REMAPPING SCRIPT
 * 1. Resets mapping for all Secondary properties.
 * 2. Applies mapping ONLY if buildingName exactly matches Project Name.
 */


function parsePhotos(photos: any): string[] {
    if (!photos) return [];
    if (Array.isArray(photos)) return photos;
    if (typeof photos === 'string') {
        const p = photos.trim();
        if (p.startsWith('{') && p.endsWith('}')) {
            // Postgres array literal format: {"url1","url2"}
            return p.substring(1, p.length - 1)
                .split(',')
                .map(v => v.trim().replace(/^"|"$/g, ''))
                .filter(Boolean);
        }
        if (p.startsWith('[') && p.endsWith(']')) {
            try { return JSON.parse(p); } catch (e) {}
        }
        return p.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
}

async function runStrictMapping() {
    try {
        console.log('🚀 Starting STRICT Remapping (Building Name ONLY)...');
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        console.log('✅ DB Connected');

        const propRepo = AppDataSource.getRepository(Property);

        // 1. Reset all Secondary mapping
        console.log('🧹 Resetting current Secondary mapping...');
        await propRepo.createQueryBuilder()
            .update(Property)
            .set({ 
                parentProjectId: null as any,
                photos: []
            } as any)
            .where('propertyType = :type', { type: PropertyType.SECONDARY })
            .execute();
        console.log('✅ Mapping reset complete.');

        // 2. Load Sources (Off-Plan)
        console.log('📦 Loading Off-Plan projects...');
        const offPlanItems = await propRepo.find({ 
            where: { propertyType: PropertyType.OFF_PLAN },
            select: ['id', 'name', 'photos']
        });

        const nameToProject = new Map<string, { id: string, photos: string[] }>();
        offPlanItems.forEach(item => {
            const name = item.name.trim().toLowerCase();
            const photos = parsePhotos(item.photos).filter(p => !p.includes('logo.png'));
            
            if (photos.length > 0) {
                const existing = nameToProject.get(name);
                if (!existing || existing.photos.length < photos.length) {
                    nameToProject.set(name, { id: item.id, photos: photos });
                }
            }
        });
        console.log(`📊 Unique Project Names for mapping: ${nameToProject.size}`);
        
        if (nameToProject.size === 0) {
            console.log('⚠️ No projects with valid photos found. Check source data.');
        }

        // 3. Apply Strict Mapping
        const secondaryCount = await propRepo.count({ where: { propertyType: PropertyType.SECONDARY } });
        console.log(`🔍 Processing ${secondaryCount} secondary market properties...`);

        let matched = 0;
        const BATCH_SIZE = 500;

        for (let i = 0; i < secondaryCount; i += BATCH_SIZE) {
            const batch = await propRepo.find({
                where: { propertyType: PropertyType.SECONDARY },
                skip: i,
                take: BATCH_SIZE
            });

            const updates = [];
            for (const prop of batch) {
                const bName = (prop.buildingName || '').trim().toLowerCase();
                if (bName) {
                    const match = nameToProject.get(bName);
                    if (match) {
                        prop.parentProjectId = match.id;
                        prop.photos = match.photos.slice(0, 15);
                        updates.push(propRepo.save(prop));
                        matched++;
                    }
                }
            }

            if (updates.length > 0) await Promise.all(updates);
            process.stdout.write(`\r   Progress: ${Math.min(i + BATCH_SIZE, secondaryCount)}/${secondaryCount} | Matched: ${matched}`);
        }

        console.log(`\n\n✅ Strict Mapping Complete!`);
        console.log(`   Total Secondary items: ${secondaryCount}`);
        console.log(`   Successfully Matched:  ${matched} (${((matched/secondaryCount)*100).toFixed(1)}%)`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

runStrictMapping();
