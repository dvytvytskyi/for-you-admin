import express from 'express';
import { AppDataSource } from '../config/database';
import { Course } from '../entities/Course';
import { authenticateJWT, authenticateAPIKey } from '../middleware/auth';
import { successResponse } from '../utils/response';

const router = express.Router();

router.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return authenticateAPIKey(req, res, next);
  return authenticateJWT(req, res, next);
});

router.get('/', async (req, res) => {
  const courses = await AppDataSource.getRepository(Course).find({
    relations: ['contents', 'links'],
  });
  res.json(successResponse(courses));
});

router.get('/:id', async (req, res) => {
  const course = await AppDataSource.getRepository(Course).findOne({
    where: { id: req.params.id },
    relations: ['contents', 'links'],
  });
  res.json(successResponse(course));
});

router.post('/', async (req, res) => {
  try {
    const courseRepository = AppDataSource.getRepository(Course);
    const course = courseRepository.create(req.body);
    const result = await courseRepository.save(course);
    const savedCourse = Array.isArray(result) ? result[0] : result;
    
    // Fetch with relations to return complete data
    const completeCourse = await courseRepository.findOne({
      where: { id: savedCourse.id },
      relations: ['contents', 'links'],
    });
    
    res.json(successResponse(completeCourse));
  } catch (error: any) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create course' });
  }
});

router.patch('/:id', async (req, res) => {
  await AppDataSource.getRepository(Course).update(req.params.id, req.body);
  const course = await AppDataSource.getRepository(Course).findOne({
    where: { id: req.params.id },
    relations: ['contents', 'links'],
  });
  res.json(successResponse(course));
});

router.delete('/:id', async (req, res) => {
  await AppDataSource.getRepository(Course).delete(req.params.id);
  res.json(successResponse(null, 'Course deleted'));
});

export default router;

