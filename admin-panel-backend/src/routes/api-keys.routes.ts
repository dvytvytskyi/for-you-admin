import express from 'express';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';
import { authenticateJWT } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import crypto from 'crypto';

const router = express.Router();

// All routes require JWT authentication
router.use(authenticateJWT);

// Generate API key and secret
const generateApiKey = () => {
  return `fyr_${crypto.randomBytes(32).toString('hex')}`;
};

const generateApiSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// GET /api/settings/api-keys - Get all API keys
router.get('/', async (req, res) => {
  try {
    const apiKeys = await AppDataSource.getRepository(ApiKey).find({
      order: { createdAt: 'DESC' },
    });

    // Don't return secrets, only show last 4 characters
    const sanitizedKeys = apiKeys.map(key => ({
      id: key.id,
      apiKey: key.apiKey,
      apiSecret: key.apiSecret ? `****${key.apiSecret.slice(-4)}` : null,
      name: key.name,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }));

    res.json(successResponse(sanitizedKeys));
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    res.status(500).json(errorResponse('Failed to fetch API keys', error.message));
  }
});

// POST /api/settings/api-keys - Create new API key
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();

    const newApiKey = AppDataSource.getRepository(ApiKey).create({
      apiKey,
      apiSecret,
      name: name || 'Untitled API Key',
      isActive: true,
    });

    const saved = await AppDataSource.getRepository(ApiKey).save(newApiKey);

    // Return full key and secret only on creation
    res.json(successResponse({
      id: saved.id,
      apiKey: saved.apiKey,
      apiSecret: saved.apiSecret,
      name: saved.name,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
    }));
  } catch (error: any) {
    console.error('Error creating API key:', error);
    res.status(500).json(errorResponse('Failed to create API key', error.message));
  }
});

// DELETE /api/settings/api-keys/:id - Delete API key
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await AppDataSource.getRepository(ApiKey).delete(id);

    if (result.affected === 0) {
      return res.status(404).json(errorResponse('API key not found'));
    }

    res.json(successResponse({ message: 'API key deleted successfully' }));
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    res.status(500).json(errorResponse('Failed to delete API key', error.message));
  }
});

// PATCH /api/settings/api-keys/:id/toggle - Toggle API key active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await AppDataSource.getRepository(ApiKey).findOne({ where: { id } });

    if (!apiKey) {
      return res.status(404).json(errorResponse('API key not found'));
    }

    apiKey.isActive = !apiKey.isActive;
    await AppDataSource.getRepository(ApiKey).save(apiKey);

    res.json(successResponse({
      id: apiKey.id,
      isActive: apiKey.isActive,
    }));
  } catch (error: any) {
    console.error('Error toggling API key:', error);
    res.status(500).json(errorResponse('Failed to toggle API key', error.message));
  }
});

export default router;

