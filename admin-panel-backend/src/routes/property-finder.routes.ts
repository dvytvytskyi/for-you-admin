import express from 'express';
import { PropertyFinderService } from '../services/property-finder.service';
import { successResponse, errorResponse } from '../utils/response';
import { authenticateJWTOrApiKey } from '../middleware/auth';

const router = express.Router();
const pfService = new PropertyFinderService();

/**
 * Отримує унікальний список локацій (районів) з бази проектів
 * GET /api/property-finder/locations
 * ПУБЛІЧНИЙ (для наповнення фільтрів)
 */
router.get('/locations', async (req, res) => {
    try {
        const locations = await pfService.getUniqueLocationsFromProjects();
        console.log(`[PropertyFinder] Sending ${locations.length} locations to frontend.`);
        res.json({
            success: true,
            data: locations
        });
    } catch (error: any) {
        console.error('[PropertyFinder] Locations API Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Отримує координати всіх проектів для карти
 * GET /api/property-finder/map
 * ПУБЛІЧНИЙ
 */
router.get('/map', async (req, res) => {
    try {
        const { status } = req.query;
        const projects = await pfService.getProjectsForMap(status as string);
        console.log(`[PropertyFinder] Sending ${projects.length} markers for map. Status: ${status || 'all'}`);
        res.json({
            success: true,
            data: projects
        });
    } catch (error: any) {
        console.error('[PropertyFinder] Map API Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Support both JWT (Admin) and API Key/Secret (Public/Agent)
router.use(authenticateJWTOrApiKey);

/**
 * Отримує список проектів Property Finder з фільтрацією
 * GET /api/property-finder/projects
 */
router.get('/projects', async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page as string) || 1,
            perPage: parseInt(req.query.perPage as string) || 24,
            ...req.query
        };
        
        const result = await pfService.getProjects(filters);
        res.json(successResponse(result));
    } catch (error: any) {
        console.error('[PropertyFinder] API Error:', error.message);
        res.status(500).json(errorResponse(error.message));
    }
});

/**
 * POST /api/property-finder/sync
 * Manually trigger sync
 */
router.post('/sync', async (req: any, res) => {
    try {
        // Only Admins can trigger sync (must have JWT with Admin role)
        // API key access is restricted for this command
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json(errorResponse('Only administrators can trigger manual synchronization'));
        }

        // Sync in background
        pfService.syncAllProjects()
            .then(result => console.log('[PropertyFinder Sync] Completed:', result))
            .catch(err => console.error('[PropertyFinder Sync] Failed:', err));
            
        res.json(successResponse({ message: 'Sync started in background' }));
    } catch (error: any) {
        res.status(500).json(errorResponse('Failed to start sync'));
    }
});

/**
 * GET /projects/:id
 * Get single project with units
 */
router.get('/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { AppDataSource } = require('../config/database');
        const { PropertyFinderProject } = require('../entities/PropertyFinderProject');
        const repo = AppDataSource.getRepository(PropertyFinderProject);
        
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let project;
        
        if (isUuid) {
            project = await repo.findOne({ where: { id } });
            if (!project) project = await repo.findOne({ where: { pfId: id } });
        } else {
            project = await repo.findOne({ where: { pfId: id } });
        }
        
        if (!project) return res.status(404).json(errorResponse('Project not found'));

        // Формуємо об'єкт чітко за структурою користувача
        const fd = project.fullData || {};
        
        // Ensure images are correctly formatted (both old and new style)
        const mediaImages = fd.media?.images || [];
        const images = project.coverImage 
            ? [project.coverImage, ...mediaImages.map((im: any) => im.original?.url).filter(Boolean)]
            : (mediaImages.length > 0 ? mediaImages.map((im: any) => im.original?.url).filter(Boolean) : []);

        const responseData = {
            id: project.id,
            pfId: project.pfId,
            title: project.title || fd.title || { en: 'Unnamed Project' },
            description: fd.description || { en: '' },
            price: {
                amounts: fd.price?.amounts || { sale: Number(project.startingPrice) || 0, yearly: 0 },
                type: fd.price?.type || 'sale',
                currency: fd.price?.currency || 'AED'
            },
            location: {
                id: project.location?.id || fd.location?.id || 0,
                name: project.location?.name || fd.location?.name || project.location || '',
                path_name: project.location?.path_name || fd.location?.path_name || '',
                coordinates: project.location?.coordinates || fd.location?.coordinates || null
            },
            developer: project.developer?.name || project.developer || fd.developer || 'Various Developers',
            images: images, // Flat array for easier use
            media: {
                images: images.map((url: string) => ({ original: { url } })), 
                videos: fd.media?.videos || fd.videos || [] 
            },
            specifications: fd.specifications || {
                bedrooms: (fd.bedrooms || '0').toString(),
                bathrooms: (fd.bathrooms || '0').toString(),
                size: Number(fd.size || 0),
                plotSize: Number(fd.plotSize || 0),
                type: fd.type || 'apartment',
                category: fd.category || 'residential',
                furnishingType: fd.furnishingType || 'unfurnished',
                finishingType: fd.finishingType || 'fully-finished',
                floorNumber: (fd.floorNumber || '').toString(),
                parkingSlots: Number(fd.parkingSlots || 0),
                numberOfFloors: Number(fd.numberOfFloors || 0)
            },
            status: fd.status || {
                projectStatus: fd.projectStatus || 'completed',
                age: fd.age || '',
                availableFrom: fd.availableFrom || ''
            },
            amenities: fd.amenities || [],
            legal_compliance: fd.legal_compliance || {
                type: fd.compliance?.type || 'rera',
                reference: fd.reference || '',
                listingAdvertisementNumber: fd.compliance?.listingAdvertisementNumber || project.dldId || '',
                landNumber: fd.landNumber || '',
                plotNumber: fd.plotNumber || '',
                unitNumber: fd.unitNumber || ''
            },
            internal_meta: fd.internal_meta || {
                reference: fd.reference || '',
                uaeEmirate: fd.uaeEmirate || 'dubai',
                hasGarden: fd.hasGarden || false,
                hasKitchen: fd.hasKitchen || false,
                hasParkingOnSite: fd.hasParkingOnSite || false,
                mojDeedLocationDescription: fd.mojDeedLocationDescription || ''
            },
            units: project.units || []
        };

        res.json(successResponse(responseData));
    } catch (error: any) {
        console.error('[PropertyFinder Route Detail] Error:', error);
        res.status(500).json(errorResponse('Failed to fetch project details'));
    }
});

export default router;
