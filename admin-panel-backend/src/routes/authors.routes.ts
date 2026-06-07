import express from 'express';
import { AppDataSource } from '../config/database';
import { Author } from '../entities/Author';
import { authenticateJWTOrApiKey } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

router.use(authenticateJWTOrApiKey);

// GET /authors - List all authors
router.get('/', async (req, res) => {
  try {
    const authors = await AppDataSource.getRepository(Author).find({
      order: { nameEn: 'ASC' }
    });
    res.json(successResponse(authors));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch authors', error.message));
  }
});

// GET /authors/:id - Get single author
router.get('/:id', async (req, res) => {
  try {
    const author = await AppDataSource.getRepository(Author).findOne({
      where: { id: req.params.id }
    });
    if (!author) return res.status(404).json(errorResponse('Author not found'));
    res.json(successResponse(author));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to fetch author', error.message));
  }
});

// POST /authors - Create author
router.post('/', async (req, res) => {
  try {
    const author = AppDataSource.getRepository(Author).create(req.body);
    const saved = await AppDataSource.getRepository(Author).save(author);
    res.status(201).json(successResponse(saved));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to create author', error.message));
  }
});

// PUT /authors/:id - Update author
router.put('/:id', async (req, res) => {
  try {
    const repository = AppDataSource.getRepository(Author);
    const author = await repository.findOne({ where: { id: req.params.id } });
    if (!author) return res.status(404).json(errorResponse('Author not found'));

    repository.merge(author, req.body);
    const saved = await repository.save(author);
    res.json(successResponse(saved));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to update author', error.message));
  }
});

// DELETE /authors/:id - Delete author
router.delete('/:id', async (req, res) => {
  try {
    const repository = AppDataSource.getRepository(Author);
    const author = await repository.findOne({ where: { id: req.params.id } });
    if (!author) return res.status(404).json(errorResponse('Author not found'));

    await repository.remove(author);
    res.json(successResponse(null, 'Author deleted successfully'));
  } catch (error: any) {
    res.status(500).json(errorResponse('Failed to delete author', error.message));
  }
});

export default router;
