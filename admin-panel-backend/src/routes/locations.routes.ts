import express from 'express';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import { City } from '../entities/City'; // Imported for potential future use or context
import { successResponse } from '../utils/response';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/locations
 * Returns a simplified list of locations (areas) with their IDs and names for usage in filters.
 * Can be filtered by query 'search' to implement autocomplete.
 */
router.get('/', async (req, res) => {
    try {
        const { search, limit } = req.query;
        const areaRepo = AppDataSource.getRepository(Area);

        const queryBuilder = areaRepo.createQueryBuilder('area')
            .leftJoinAndSelect('area.city', 'city')
            .select(['area.id', 'area.nameEn', 'city.nameEn', 'city.id']);

        if (search) {
            const searchTerm = `%${String(search).toLowerCase()}%`;
            queryBuilder.where(
                '(LOWER(area.nameEn) LIKE :search OR LOWER(city.nameEn) LIKE :search)',
                { search: searchTerm }
            );
        }

        // Sort by popularity or properties count if available, otherwise by name
        // For now, simple sort
        queryBuilder.orderBy('area.nameEn', 'ASC');

        if (limit) {
            queryBuilder.take(parseInt(String(limit), 10));
        } else if (search) {
            // Default limit for search results
            queryBuilder.take(20);
        }

        const areas = await queryBuilder.getMany();

        const result = areas.map(area => ({
            id: area.id,
            name: area.nameEn,
            city: area.city?.nameEn,
            cityId: area.city?.id,
            // Composite label for UI (e.g. "Dubai Marina, Dubai")
            label: area.city ? `${area.nameEn}, ${area.city.nameEn}` : area.nameEn
        }));

        res.json(successResponse(result));
    } catch (error: any) {
        console.error('Error fetching locations:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch locations',
        });
    }
});

export default router;
