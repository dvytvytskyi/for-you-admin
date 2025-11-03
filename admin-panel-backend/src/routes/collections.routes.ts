import express from 'express';
import { AppDataSource } from '../config/database';
import { Collection } from '../entities/Collection';
import { Property } from '../entities/Property';
import { authenticateJWT } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

router.use(authenticateJWT);

// GET /api/collections - Get all collections for current user
router.get('/', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const collections = await AppDataSource.getRepository(Collection).find({
      where: { userId },
      relations: ['properties', 'properties.country', 'properties.city', 'properties.area', 'properties.developer'],
      order: { createdAt: 'DESC' },
    });

    res.json(successResponse(collections));
  } catch (error: any) {
    console.error('Error fetching collections:', error);
    res.status(500).json(errorResponse('Failed to fetch collections'));
  }
});

// POST /api/collections - Create new collection
router.post('/', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json(errorResponse('Name is required'));
    }

    const collection = AppDataSource.getRepository(Collection).create({
      userId,
      name,
      description,
      properties: [],
    });

    const savedCollection = await AppDataSource.getRepository(Collection).save(collection);

    res.status(201).json(successResponse(savedCollection));
  } catch (error: any) {
    console.error('Error creating collection:', error);
    res.status(500).json(errorResponse('Failed to create collection'));
  }
});

// PUT /api/collections/:id - Update collection
router.put('/:id', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, description } = req.body;

    const collection = await AppDataSource.getRepository(Collection).findOne({
      where: { id, userId },
    });

    if (!collection) {
      return res.status(404).json(errorResponse('Collection not found'));
    }

    if (name) collection.name = name;
    if (description !== undefined) collection.description = description;

    const updated = await AppDataSource.getRepository(Collection).save(collection);

    const collectionWithRelations = await AppDataSource.getRepository(Collection).findOne({
      where: { id: updated.id },
      relations: ['properties'],
    });

    res.json(successResponse(collectionWithRelations));
  } catch (error: any) {
    console.error('Error updating collection:', error);
    res.status(500).json(errorResponse('Failed to update collection'));
  }
});

// DELETE /api/collections/:id - Delete collection
router.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const collection = await AppDataSource.getRepository(Collection).findOne({
      where: { id, userId },
    });

    if (!collection) {
      return res.status(404).json(errorResponse('Collection not found'));
    }

    await AppDataSource.getRepository(Collection).remove(collection);

    res.json(successResponse(null, 'Collection deleted'));
  } catch (error: any) {
    console.error('Error deleting collection:', error);
    res.status(500).json(errorResponse('Failed to delete collection'));
  }
});

// POST /api/collections/:id/properties - Add property to collection
router.post('/:id/properties', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json(errorResponse('Property ID is required'));
    }

    const collection = await AppDataSource.getRepository(Collection).findOne({
      where: { id, userId },
      relations: ['properties'],
    });

    if (!collection) {
      return res.status(404).json(errorResponse('Collection not found'));
    }

    const property = await AppDataSource.getRepository(Property).findOne({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json(errorResponse('Property not found'));
    }

    // Перевірка чи property вже в колекції
    if (collection.properties.some(p => p.id === propertyId)) {
      return res.status(409).json(errorResponse('Property already in collection'));
    }

    collection.properties.push(property);
    await AppDataSource.getRepository(Collection).save(collection);

    const updatedCollection = await AppDataSource.getRepository(Collection).findOne({
      where: { id: collection.id },
      relations: ['properties', 'properties.country', 'properties.city', 'properties.area', 'properties.developer'],
    });

    res.json(successResponse(updatedCollection));
  } catch (error: any) {
    console.error('Error adding property to collection:', error);
    res.status(500).json(errorResponse('Failed to add property to collection'));
  }
});

// DELETE /api/collections/:id/properties/:propertyId - Remove property from collection
router.delete('/:id/properties/:propertyId', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { id, propertyId } = req.params;

    const collection = await AppDataSource.getRepository(Collection).findOne({
      where: { id, userId },
      relations: ['properties'],
    });

    if (!collection) {
      return res.status(404).json(errorResponse('Collection not found'));
    }

    collection.properties = collection.properties.filter(p => p.id !== propertyId);
    await AppDataSource.getRepository(Collection).save(collection);

    const updatedCollection = await AppDataSource.getRepository(Collection).findOne({
      where: { id: collection.id },
      relations: ['properties', 'properties.country', 'properties.city', 'properties.area', 'properties.developer'],
    });

    res.json(successResponse(updatedCollection));
  } catch (error: any) {
    console.error('Error removing property from collection:', error);
    res.status(500).json(errorResponse('Failed to remove property from collection'));
  }
});

export default router;

