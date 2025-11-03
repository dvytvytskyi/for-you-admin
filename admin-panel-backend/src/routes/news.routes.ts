import express from 'express';
import { AppDataSource } from '../config/database';
import { News } from '../entities/News';
import { authenticateJWT, authenticateAPIKey } from '../middleware/auth';
import { successResponse } from '../utils/response';

const router = express.Router();

router.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return authenticateAPIKey(req, res, next);
  return authenticateJWT(req, res, next);
});

router.get('/', async (req, res) => {
  const news = await AppDataSource.getRepository(News).find({
    relations: ['contents'],
  });
  res.json(successResponse(news));
});

router.get('/:id', async (req, res) => {
  const newsItem = await AppDataSource.getRepository(News).findOne({
    where: { id: req.params.id },
    relations: ['contents'],
  });
  res.json(successResponse(newsItem));
});

router.post('/', async (req, res) => {
  try {
    const newsRepository = AppDataSource.getRepository(News);
    const newsItem = newsRepository.create(req.body);
    const result = await newsRepository.save(newsItem);
    const savedNews = Array.isArray(result) ? result[0] : result;
    
    // Fetch with relations to return complete data
    const completeNews = await newsRepository.findOne({
      where: { id: savedNews.id },
      relations: ['contents'],
    });
    
    res.json(successResponse(completeNews));
  } catch (error: any) {
    console.error('Error creating news:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create news' });
  }
});

router.patch('/:id', async (req, res) => {
  await AppDataSource.getRepository(News).update(req.params.id, req.body);
  const newsItem = await AppDataSource.getRepository(News).findOne({
    where: { id: req.params.id },
    relations: ['contents'],
  });
  res.json(successResponse(newsItem));
});

router.delete('/:id', async (req, res) => {
  await AppDataSource.getRepository(News).delete(req.params.id);
  res.json(successResponse(null, 'News deleted'));
});

export default router;

