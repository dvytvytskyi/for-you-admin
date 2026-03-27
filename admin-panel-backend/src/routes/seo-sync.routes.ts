import { Router } from 'express';
import { PropertyFinderService } from '../services/property-finder.service';
import { AppDataSource } from '../config/database';
import { SeoArea } from '../entities/SeoArea';

const router = Router();
const pfService = new PropertyFinderService();

// Синхронізація локацій з Property Finder
router.post('/sync-locations', async (req, res) => {
    try {
        const locations = await pfService.getLocations('Dubai'); // Поки беремо по Дубаю
        const areaRepo = AppDataSource.getRepository(SeoArea);
        
        let createdCount = 0;
        for (const loc of locations) {
            // Перевіряємо чи вже є така локація
            const existing = await areaRepo.findOneBy({ 
                name: loc.name 
            });

            if (!existing) {
                const newArea = areaRepo.create({
                    name: loc.name,
                    description: `Automated sync from Property Finder (Type: ${loc.type})`,
                    slug: loc.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
                    analyticalInfo: JSON.stringify({
                        pfId: loc.id,
                        type: loc.type,
                        coordinates: loc.coordinates
                    })
                });
                await areaRepo.save(newArea);
                createdCount++;
            }
        }

        res.json({ message: 'Sync completed', created: createdCount, total: locations.length });
    } catch (error: any) {
        console.error('Sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Синхронізація проектів та юнітів з Property Finder
router.post('/sync-projects', async (req, res) => {
    try {
        console.log('[SEO Sync] Starting projects & units sync...');
        const result = await pfService.syncAllProjects();
        res.json({ 
            message: 'Projects & Units sync completed', 
            syncedProjects: result.synced,
            unitsSynced: result.unitsSynced,
            failed: result.failed
        });
    } catch (error: any) {
        console.error('[SEO Sync] Projects sync error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
