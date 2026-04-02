import express from 'express';
import { AppDataSource } from '../../config/database';
import { Vacancy, VacancyStatus } from '../../entities/Vacancy';
import { VacancyRequest } from '../../entities/VacancyRequest';
import { successResponse } from '../../utils/response';

const router = express.Router();

// GET /api/public/vacancies - Get all published vacancies (PUBLIC)
router.get('/', async (req, res) => {
    try {
        const lang = (req.query.lang as string) || 'en';
        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        const vacancies = await vacancyRepo.find({
            where: [
                { status: VacancyStatus.PUBLISHED },
                { status: VacancyStatus.PENDING }
            ],
            order: { createdAt: 'DESC' },
        });

        // Map localized fields to base fields based on language
        const localizedVacancies = vacancies.map(v => ({
            id: v.id,
            position: lang === 'ru' ? (v.position_ru || v.position_en || v.position) : (v.position_en || v.position),
            shortDescription: lang === 'ru' ? (v.shortDescription_ru || v.shortDescription_en || v.shortDescription) : (v.shortDescription_en || v.shortDescription),
            tasks: lang === 'ru' ? (v.tasks_ru || v.tasks_en || v.tasks) : (v.tasks_en || v.tasks),
            requirements: lang === 'ru' ? (v.requirements_ru || v.requirements_en || v.requirements) : (v.requirements_en || v.requirements),
            results: lang === 'ru' ? (v.results_ru || v.results_en || v.results) : (v.results_en || v.results),
            offers: lang === 'ru' ? (v.offers_ru || v.offers_en || v.offers) : (v.offers_en || v.offers),
            viewsCount: v.viewsCount,
            applicationsCount: v.applicationsCount,
            createdAt: v.createdAt,
            // Also provide both versions if needed by client
            position_en: v.position_en,
            position_ru: v.position_ru,
            shortDescription_en: v.shortDescription_en,
            shortDescription_ru: v.shortDescription_ru
        }));

        res.json(successResponse(localizedVacancies));
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/public/vacancies/:id - Get single published vacancy (PUBLIC)
router.get('/:id', async (req, res) => {
    try {
        const lang = (req.query.lang as string) || 'en';
        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        const vacancy = await vacancyRepo.findOne({
            where: [
                { id: req.params.id, status: VacancyStatus.PUBLISHED },
                { id: req.params.id, status: VacancyStatus.PENDING }
            ],
        });

        if (!vacancy) {
            return res.status(404).json({ success: false, message: 'Vacancy not found or not published' });
        }

        // Increment views count
        vacancy.viewsCount += 1;
        await vacancyRepo.save(vacancy);

        // Map localized fields
        const localizedVacancy = {
            ...vacancy,
            position: lang === 'ru' ? (vacancy.position_ru || vacancy.position_en || vacancy.position) : (vacancy.position_en || vacancy.position),
            shortDescription: lang === 'ru' ? (vacancy.shortDescription_ru || vacancy.shortDescription_en || vacancy.shortDescription) : (vacancy.shortDescription_en || vacancy.shortDescription),
            tasks: lang === 'ru' ? (vacancy.tasks_ru || vacancy.tasks_en || vacancy.tasks) : (vacancy.tasks_en || vacancy.tasks),
            requirements: lang === 'ru' ? (vacancy.requirements_ru || vacancy.requirements_en || vacancy.requirements) : (vacancy.requirements_en || vacancy.requirements),
            results: lang === 'ru' ? (vacancy.results_ru || vacancy.results_en || vacancy.results) : (vacancy.results_en || vacancy.results),
            offers: lang === 'ru' ? (vacancy.offers_ru || vacancy.offers_en || vacancy.offers) : (vacancy.offers_en || vacancy.offers),
        };

        res.json(successResponse(localizedVacancy));
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/public/vacancies/:id/apply - Submit application for vacancy (PUBLIC)
router.post('/:id/apply', async (req, res) => {
    try {
        const { name, email, phone, message, cvUrl } = req.body;

        // Validation
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }

        // Check if vacancy exists and is published
        const vacancyRepo = AppDataSource.getRepository(Vacancy);
        const vacancy = await vacancyRepo.findOne({
            where: { id: req.params.id, status: VacancyStatus.PUBLISHED },
        });

        if (!vacancy) {
            return res.status(404).json({
                success: false,
                message: 'Vacancy not found or not published'
            });
        }

        // Create application request
        const requestRepo = AppDataSource.getRepository(VacancyRequest);
        const vacancyRequest = requestRepo.create({
            vacancyId: req.params.id,
            name,
            email,
            phone,
            message,
            cvUrl,
        });

        const result = await requestRepo.save(vacancyRequest);

        // Forward to AmoCRM
        try {
            const { AmoCrmService } = await import('../../services/amo-crm.service');
            const amoCrmService = new AmoCrmService();
            await amoCrmService.submitEnquiryToAmo({
                name,
                email,
                phone,
                message,
                source: `Job Application: ${vacancy.position}`,
                additionalInfo: {
                    vacancyId: req.params.id,
                    position: vacancy.position,
                    cvUrl,
                    applicationId: result.id
                }
            });
        } catch (amoError) {
            console.error('Failed to forward vacancy application to AmoCRM:', amoError);
        }

        // Increment applications count
        vacancy.applicationsCount += 1;
        await vacancyRepo.save(vacancy);

        res.json(successResponse(result, 'Application submitted successfully'));
    } catch (error: any) {
        console.error('Error submitting vacancy application:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
