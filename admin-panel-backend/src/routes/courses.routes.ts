import express from 'express';
import { AppDataSource } from '../config/database';
import { Course } from '../entities/Course';
import { CourseProgress } from '../entities/CourseProgress';
import { authenticateJWTOrApiKey } from '../middleware/auth';
import { successResponse } from '../utils/response';

const router = express.Router();

router.use(authenticateJWTOrApiKey);

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

// POST /api/courses/:id/progress - Update course progress for current user
router.post('/:id/progress', async (req: any, res) => {
  try {
    const courseId = req.params.id;
    const { status } = req.body;
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const progressRepository = AppDataSource.getRepository(CourseProgress);
    let progress = await progressRepository.findOne({
      where: { userId, courseId }
    });

    if (!progress) {
      progress = progressRepository.create({
        userId,
        courseId,
        status,
        progressPercentage: status === 'COMPLETED' ? 100 : (status === 'IN_PROGRESS' ? 10 : 0),
        isCompleted: status === 'COMPLETED',
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        lastAccessedAt: new Date()
      });
    } else {
      progress.status = status;
      progress.lastAccessedAt = new Date();
      if (status === 'COMPLETED') {
        progress.progressPercentage = 100;
        progress.isCompleted = true;
        if (!progress.completedAt) progress.completedAt = new Date();
      } else if (status === 'NOT_STARTED') {
        progress.progressPercentage = 0;
        progress.isCompleted = false;
      }
    }

    await progressRepository.save(progress);

    res.json(successResponse({
      status: progress.status,
      completionPercentage: progress.progressPercentage
    }));
  } catch (error: any) {
    console.error('Error updating course progress:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update progress' });
  }
});

export default router;

