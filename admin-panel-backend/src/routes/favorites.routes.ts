import express from 'express';
import { AppDataSource } from '../config/database';
import { Favorite } from '../entities/Favorite';
import { Property } from '../entities/Property';
import { authenticateJWT } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

router.use(authenticateJWT);

// GET /api/favorites - Get all favorites for current user
// Returns: { success: true, data: Property[] }
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const favorites = await AppDataSource.getRepository(Favorite).find({
      where: { userId },
      relations: [
        'property',
        'property.country',
        'property.city',
        'property.area',
        'property.developer',
        'property.facilities',
        'property.units', // Додаємо units для повної інформації
      ],
      order: { createdAt: 'DESC' },
    });

    // Повертаємо тільки properties з усіма relations
    const properties = favorites.map(f => f.property).filter(p => p !== null && p !== undefined);
    
    res.json({
      success: true,
      data: properties,
    });
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    res.status(500).json(errorResponse('Failed to fetch favorites'));
  }
});

// GET /api/favorites/ids - Get only favorite IDs (for quick synchronization)
// Returns: { success: true, data: { favoriteIds: string[] } }
// ВАЖЛИВО: Цей маршрут має бути перед /:propertyId, інакше "ids" буде інтерпретовано як propertyId
router.get('/ids', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const favorites = await AppDataSource.getRepository(Favorite).find({
      where: { userId },
      select: ['propertyId'],
    });

    const favoriteIds = favorites.map(f => f.propertyId);

    res.json({
      success: true,
      data: { favoriteIds },
    });
  } catch (error: any) {
    console.error('Error fetching favorite IDs:', error);
    res.status(500).json(errorResponse('Failed to fetch favorite IDs'));
  }
});

// GET /api/favorites/:propertyId/status - Check if property is in favorites
// Returns: { success: true, data: { isFavorite: boolean, propertyId: string } }
router.get('/:propertyId/status', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { propertyId } = req.params;

    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const favorite = await AppDataSource.getRepository(Favorite).findOne({
      where: { userId, propertyId },
    });

    const isFavorite = !!favorite;

    res.json({
      success: true,
      data: {
        isFavorite,
        propertyId,
      },
    });
  } catch (error: any) {
    console.error('Error checking favorite status:', error);
    res.status(500).json(errorResponse('Failed to check favorite status'));
  }
});

// POST /api/favorites/:propertyId - Add property to favorites
// Returns: { success: true, data: { message: string, propertyId: string } }
// Status: 201 Created
router.post('/:propertyId', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { propertyId } = req.params;

    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    // Перевірка чи property існує
    const property = await AppDataSource.getRepository(Property).findOne({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json(errorResponse('Property not found'));
    }

    // Перевірка чи вже в favorites
    const existing = await AppDataSource.getRepository(Favorite).findOne({
      where: { userId, propertyId },
    });

    // Ідемпотентність: якщо вже є, просто повертаємо success
    if (existing) {
      return res.status(201).json({
        success: true,
        data: {
          message: 'Property already in favorites',
          propertyId,
        },
      });
    }

    // Додаємо в favorites
    const favorite = AppDataSource.getRepository(Favorite).create({
      userId,
      propertyId,
    });

    await AppDataSource.getRepository(Favorite).save(favorite);

    res.status(201).json({
      success: true,
      data: {
        message: 'Property added to favorites',
        propertyId,
      },
    });
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    res.status(500).json(errorResponse('Failed to add favorite'));
  }
});

// DELETE /api/favorites/:propertyId - Remove property from favorites
// Returns: { success: true, data: { message: string, propertyId: string } }
router.delete('/:propertyId', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { propertyId } = req.params;

    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const favorite = await AppDataSource.getRepository(Favorite).findOne({
      where: { userId, propertyId },
    });

    // Ідемпотентність: якщо немає, просто повертаємо success
    if (!favorite) {
      return res.json({
        success: true,
        data: {
          message: 'Property was not in favorites',
          propertyId,
        },
      });
    }

    await AppDataSource.getRepository(Favorite).remove(favorite);

    res.json({
      success: true,
      data: {
        message: 'Property removed from favorites',
        propertyId,
      },
    });
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    res.status(500).json(errorResponse('Failed to remove favorite'));
  }
});

export default router;

