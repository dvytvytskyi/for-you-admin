import express from 'express';
import { AppDataSource } from '../config/database';
import { SupportRequest, SupportStatus } from '../entities/SupportRequest';
import { SupportResponse } from '../entities/SupportResponse';
import { authenticateJWT, authenticateAPIKey } from '../middleware/auth';
import { successResponse } from '../utils/response';

const router = express.Router();

router.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return authenticateAPIKey(req, res, next);
  return authenticateJWT(req, res, next);
});

router.get('/', async (req, res) => {
  const requests = await AppDataSource.getRepository(SupportRequest).find({
    relations: ['responses'],
    order: { createdAt: 'DESC' },
  });
  res.json(successResponse(requests));
});

router.get('/:id', async (req, res) => {
  const request = await AppDataSource.getRepository(SupportRequest).findOne({
    where: { id: req.params.id },
    relations: ['responses'],
  });
  res.json(successResponse(request));
});

router.post('/', async (req, res) => {
  const request = await AppDataSource.getRepository(SupportRequest).save(req.body);
  res.json(successResponse(request));
});

router.post('/:id/responses', async (req, res) => {
  const { message, isFromAdmin } = req.body;
  const response = await AppDataSource.getRepository(SupportResponse).save({
    supportRequestId: req.params.id,
    message,
    isFromAdmin: isFromAdmin || false,
  });

  // Auto-update status to IN_PROGRESS when first response added
  const request = await AppDataSource.getRepository(SupportRequest).findOne({
    where: { id: req.params.id },
    relations: ['responses'],
  });
  
  if (request && request.responses.length === 1 && request.status === SupportStatus.PENDING) {
    await AppDataSource.getRepository(SupportRequest).update(req.params.id, {
      status: SupportStatus.IN_PROGRESS,
    });
  }

  res.json(successResponse(response));
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  await AppDataSource.getRepository(SupportRequest).update(req.params.id, { status });
  const request = await AppDataSource.getRepository(SupportRequest).findOne({
    where: { id: req.params.id },
  });
  res.json(successResponse(request));
});

export default router;

