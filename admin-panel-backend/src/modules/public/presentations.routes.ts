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
    const { 
      page = '1', 
      limit = '100', // Default higher limit for presentations
      search 
    } = req.query;

    const pageNum = parseInt(page.toString(), 10) || 1;
    const limitNum = parseInt(limit.toString(), 10) || 100;
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

    if (search) {
      const searchTerm = `%${search.toString().toLowerCase()}%`;
      queryBuilder.andWhere('LOWER(property.name) LIKE :searchTerm', { searchTerm });
    }

    const [items, totalCount] = await queryBuilder
      .orderBy('property.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const data = items.map(p => {
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
    console.error('[Presentations API] Error:', error);
    res.status(500).json(errorResponse('Failed to fetch presentations data', error.message));
  }
});

export default router;
