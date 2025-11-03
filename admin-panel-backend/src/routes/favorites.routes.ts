import express from 'express';
import { AppDataSource } from '../config/database';
import { Favorite } from '../entities/Favorite';
import { Property } from '../entities/Property';
import { authenticateJWT } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

router.use(authenticateJWT);

// GET /api/favorites - Get all favorites for current user
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const favorites = await AppDataSource.getRepository(Favorite).find({
      where: { userId },
      relations: ['property', 'property.country', 'property.city', 'property.area', 'property.developer', 'property.facilities'],
      order: { createdAt: 'DESC' },
    });

    // Повертаємо тільки properties
    const properties = favorites.map(f => f.property);
    res.json(successResponse(properties));
  } catch (error: any) {
    console.error('Error fetching favorites:', error);
    res.status(500).json(errorResponse('Failed to fetch favorites'));
  }
});

// POST /api/favorites/:propertyId - Add property to favorites
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

    if (existing) {
      return res.status(409).json(errorResponse('Property already in favorites'));
    }

    const favorite = AppDataSource.getRepository(Favorite).create({
      userId,
      propertyId,
    });

    const saved = await AppDataSource.getRepository(Favorite).save(favorite);

    const favoriteWithProperty = await AppDataSource.getRepository(Favorite).findOne({
      where: { id: saved.id },
      relations: ['property', 'property.country', 'property.city', 'property.area', 'property.developer'],
    });

    res.status(201).json(successResponse(favoriteWithProperty?.property));
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    res.status(500).json(errorResponse('Failed to add favorite'));
  }
});

// DELETE /api/favorites/:propertyId - Remove property from favorites
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

    if (!favorite) {
      return res.status(404).json(errorResponse('Favorite not found'));
    }

    await AppDataSource.getRepository(Favorite).remove(favorite);

    res.json(successResponse(null, 'Favorite removed'));
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    res.status(500).json(errorResponse('Failed to remove favorite'));
  }
});

export default router;

