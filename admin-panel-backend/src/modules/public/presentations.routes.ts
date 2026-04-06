import express from 'express';
import { AppDataSource } from '../../config/database';
import { Property, PropertyType } from '../../entities/Property';
import { successResponse, errorResponse } from '../../utils/response';
import { authenticateApiKeyWithSecret, AuthRequest } from '../../middleware/auth';

const router = express.Router();

/**
 * GET /api/public/presentations
 * Returns all off-plan projects with detailed information including units, 
 * photo stats, and other metadata for presentation purposes.
 */
router.get('/', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const pageValue = (req.query.page || '1').toString();
    const limitValue = (req.query.limit || '100').toString();
    const pageNum = parseInt(pageValue, 10) || 1;
    const limitNum = parseInt(limitValue, 10) || 100;
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = AppDataSource.getRepository(Property)
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('property.city', 'city')
      .leftJoinAndSelect('property.developer', 'developer')
      .leftJoinAndSelect('property.units', 'units')
      .leftJoinAndSelect('property.facilities', 'facilities')
      .where('property.propertyType IN (:...types)', { 
        types: [PropertyType.OFF_PLAN, PropertyType.NEW_LAUNCHES, PropertyType.EXCLUSIVE_FOR_YOU] 
      })
      .andWhere('property.isActive = :isActive', { isActive: true });

    if (req.query.search) {
      const searchTerm = `%${req.query.search.toString().toLowerCase()}%`;
      queryBuilder.andWhere('LOWER(property.name) LIKE :searchTerm', { searchTerm });
    }

    const isLite = req.query.mode === 'lite';

    const [items, totalCount] = await queryBuilder
      .orderBy('property.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const data = items.map(p => {
      // If lite mode requested, return only base fields for quick loading
      if (isLite) {
        return {
          id: p.id,
          name: p.name,
          area: p.area?.nameEn,
          developer: p.developer?.name,
          thumbnail: p.photos && p.photos.length > 0 ? p.photos[0] : null
        };
      }

      const photos = p.photos || [];
      const hasPhotos = photos.length > 0;
      
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        priceFrom: p.priceFrom,
        bedroomsFrom: p.bedroomsFrom,
        bedroomsTo: p.bedroomsTo,
        sizeFrom: p.sizeFrom,
        sizeTo: p.sizeTo,
        status: p.status,
        readiness: p.readiness,
        completionDate: p.plannedCompletionAt || p.completionDatetime,
        description: p.description,
        descriptionRu: p.descriptionRu,
        
        // Location & Developer
        area: p.area?.nameEn,
        city: p.city?.nameEn,
        developer: p.developer?.name,
        
        // Photos Info
        hasPhotos,
        photosCount: photos.length,
        photos: photos,
        
        // Units Info
        unitsCount: p.units?.length || 0,
        units: (p.units || []).map(u => ({
          id: u.id,
          unitId: u.unitId,
          type: u.type,
          price: u.price,
          totalSize: u.totalSize,
          bedrooms: u.bedrooms,
          floor: u.floor,
          status: u.status,
          hasPlanImage: !!(u.planImage || u.planImages)
        })),
        
        // Amenities
        facilities: (p.facilities || []).map(f => f.nameEn),
        
        // Extra info requested for presentations
        isForYouChoice: p.isForYouChoice,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    res.json(successResponse({
      data,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    }));

  } catch (error: any) {
    console.error('[Presentations API] CRITICAL Error:', error);
    res.status(500).json(errorResponse('Failed to fetch presentations data', error.message));
  }
});

/**
 * GET /api/public/presentations/:id
 * Returns detailed information for a specific presentation/project.
 */
router.get('/:id', authenticateApiKeyWithSecret, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const property = await AppDataSource.getRepository(Property)
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.area', 'area')
      .leftJoinAndSelect('property.city', 'city')
      .leftJoinAndSelect('property.developer', 'developer')
      .leftJoinAndSelect('property.units', 'units')
      .leftJoinAndSelect('property.facilities', 'facilities')
      .where('property.id = :id', { id })
      .getOne();

    if (!property) {
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Detailed response for specific project
    const detailedData = {
      id: property.id,
      name: property.name,
      slug: property.slug,
      description: property.description,
      descriptionRu: property.descriptionRu,
      
      // Location & Developer
      area: property.area?.nameEn,
      city: property.city?.nameEn,
      developer: property.developer?.name,
      coordinates: {
        latitude: property.latitude,
        longitude: property.longitude
      },
      
      // Photos & Media
      photos: property.photos || [],
      videoUrl: property.videoUrl,
      
      // Payment Plans & Extra Info
      paymentPlans: property.paymentPlansJson || property.paymentPlan,
      amenities: (property.facilities || []).map(f => f.nameEn),
      
      // Units Info
      units: (property.units || []).map(u => ({
        id: u.id,
        unitId: u.unitId,
        type: u.type,
        price: u.price,
        totalSize: u.totalSize,
        bedrooms: u.bedrooms,
        floor: u.floor,
        status: u.status,
        planImage: u.planImage || (u.planImages ? u.planImages.large || u.planImages.original : null)
      })),
      
      // Status information
      status: property.status,
      readiness: property.readiness,
      completionDate: property.plannedCompletionAt || property.completionDatetime,
      isForYouChoice: property.isForYouChoice,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt
    };

    res.json(successResponse(detailedData));

  } catch (error: any) {
    console.error(`[Presentations API] Error fetching details for project ${req.params.id}:`, error);
    res.status(500).json(errorResponse('Failed to fetch project details', error.message));
  }
});

export default router;
