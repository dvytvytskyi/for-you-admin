import express from 'express';
import { AppDataSource } from '../config/database';
import { SeoDeveloper } from '../entities/SeoDeveloper';
import { SeoArea } from '../entities/SeoArea';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticateJWT);

// Developers
router.get('/developers', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoDeveloper);
        const developers = await repo.find({ order: { name: 'ASC' } });
        res.json({ success: true, data: developers });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/developers/:id', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoDeveloper);
        const developer = await repo.findOne({ where: { id: req.params.id } });
        if (!developer) return res.status(404).json({ success: false, message: 'Developer not found' });
        res.json({ success: true, data: developer });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/developers', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoDeveloper);
        const developer = repo.create(req.body);
        await repo.save(developer);
        res.json({ success: true, data: developer });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.patch('/developers/:id', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoDeveloper);
        await repo.update(req.params.id, req.body);
        const updated = await repo.findOne({ where: { id: req.params.id } });
        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/developers/:id', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoDeveloper);
        await repo.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Areas
router.get('/areas', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoArea);
        const areas = await repo.find({ order: { name: 'ASC' } });
        res.json({ success: true, data: areas });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/areas/:id', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoArea);
        const area = await repo.findOne({ where: { id: req.params.id } });
        if (!area) return res.status(404).json({ success: false, message: 'Area not found' });
        res.json({ success: true, data: area });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/areas', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoArea);
        const area = repo.create(req.body);
        await repo.save(area);
        res.json({ success: true, data: area });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.patch('/areas/:id', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoArea);
        await repo.update(req.params.id, req.body);
        const updated = await repo.findOne({ where: { id: req.params.id } });
        res.json({ success: true, data: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/areas/:id', async (req: AuthRequest, res) => {
    try {
        const repo = AppDataSource.getRepository(SeoArea);
        await repo.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
