import express from 'express';
import { AppDataSource } from '../config/database';
import { Vacancy } from '../entities/Vacancy';
import { VacancyRequest } from '../entities/VacancyRequest';
import { authenticateJWT } from '../middleware/auth';
import { successResponse } from '../utils/response';

const router = express.Router();

// All routes here are protected for admin
router.use(authenticateJWT);

// GET /api/vacancies - List all vacancies
router.get('/', async (req, res) => {
    try {
        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        const vacancies = await vacancyRepo.find({
            order: { createdAt: 'DESC' }
        });
        res.json(successResponse(vacancies));
    } catch (error: any) {
        console.error('Error fetching vacancies:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/vacancies - Create new vacancy
router.post('/', async (req, res) => {
    try {
        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        const vacancy = vacancyRepo.create(req.body);
        const result = await vacancyRepo.save(vacancy);
        res.json(successResponse(result));
    } catch (error: any) {
        console.error('Error creating vacancy:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/vacancies/requests/all - Get all requests (MUST BE BEFORE :id)
router.get('/requests/all', async (req, res) => {
    try {
        const requestRepo = AppDataSource.getRepository(VacancyRequest);
        const requests = await requestRepo.find({
            relations: ['vacancy'],
            order: { createdAt: 'DESC' }
        });
        res.json(successResponse(requests));
    } catch (error: any) {
        console.error('Error fetching vacancy requests:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/vacancies/:id - Get single vacancy
router.get('/:id', async (req, res) => {
    try {
        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        const vacancy = await vacancyRepo.findOne({
            where: { id: req.params.id },
            relations: ['requests']
        });
        if (!vacancy) return res.status(404).json({ success: false, message: 'Vacancy not found' });
        res.json(successResponse(vacancy));
    } catch (error: any) {
        console.error('Error fetching vacancy:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PATCH /api/vacancies/:id - Update vacancy
router.patch('/:id', async (req, res) => {
    try {
        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        let vacancy = await vacancyRepo.findOne({ where: { id: req.params.id } });
        if (!vacancy) return res.status(404).json({ success: false, message: 'Vacancy not found' });

        vacancyRepo.merge(vacancy, req.body);
        const result = await vacancyRepo.save(vacancy);
        res.json(successResponse(result));
    } catch (error: any) {
        console.error('Error updating vacancy:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/vacancies/:id - Delete vacancy
router.delete('/:id', async (req, res) => {
    try {
        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        await vacancyRepo.delete(req.params.id);
        res.json(successResponse(null, 'Vacancy deleted'));
    } catch (error: any) {
        console.error('Error deleting vacancy:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
