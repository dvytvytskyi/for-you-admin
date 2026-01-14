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
  try {
    const { contents, ...updateData } = req.body;
    const newsRepository = AppDataSource.getRepository(News);

    // Check if news exists
    const existingNews = await newsRepository.findOne({
      where: { id: req.params.id },
      relations: ['contents'],
    });

    if (!existingNews) {
      return res.status(404).json({ success: false, message: 'News not found' });
    }

    // Update basic fields
    Object.assign(existingNews, updateData);

    // Handle contents update if provided
    if (contents) {
      // Manual handling of contents to ensure newsId is set correctly
      // 1. Delete existing contents not present in the new list (or simply delete all and recreate for simplicity/safety with ordering)
      // To preserve IDs for existing items, we could do a smart update, but deleting all and re-adding is safer for order and cleanup.
      // However, if we want to keep IDs constant, we should check which ones to update vs create.

      // Simpler approach that fixes the "null newsId" issue:
      // Clear existing contents first
      const contentRepo = AppDataSource.getRepository('NewsContent');
      await contentRepo.delete({ newsId: req.params.id });

      // 2. Create new content instances
      const newContents = contents.map((c: any, index: number) => {
        return contentRepo.create({
          newsId: req.params.id, // Explicitly set newsId
          type: c.type,
          title: c.title,
          description: c.description || '',
          imageUrl: c.imageUrl || null,
          videoUrl: c.videoUrl || null,
          order: index
        });
      });

      // 3. Save new contents
      if (newContents.length > 0) {
        await contentRepo.save(newContents);
      }

      // Update the main entity without the contents array to avoid conflicts
      delete (existingNews as any).contents;
    }

    // Save the main news entity updates
    // We fetch expected entity again to minimize conflicts but we already have existingNews updated
    await newsRepository.save(existingNews);

    // Fetch final result
    const savedNews = await newsRepository.findOne({
      where: { id: req.params.id },
      relations: ['contents'],
      order: {
        contents: {
          order: 'ASC'
        }
      }
    });

    res.json(successResponse(savedNews));
  } catch (error: any) {
    console.error('Error updating news:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update news' });
  }
});

router.delete('/:id', async (req, res) => {
  await AppDataSource.getRepository(News).delete(req.params.id);
  res.json(successResponse(null, 'News deleted'));
});

export default router;

