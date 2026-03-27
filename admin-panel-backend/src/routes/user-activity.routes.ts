import express from 'express';
import { AppDataSource } from '../config/database';
import { UserSession } from '../entities/UserSession';
import { UserActivity } from '../entities/UserActivity';
import { successResponse, errorResponse } from '../utils/response';
import { authenticateApiKeyWithSecret, authenticateJWT } from '../middleware/auth';

const router = express.Router();

function generateReferenceId(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const randL = () => letters[Math.floor(Math.random() * letters.length)];
    const randN = () => numbers[Math.floor(Math.random() * numbers.length)];
    return `FY-${randN()}${randN()}${randN()}${randL()}${randL()}`;
}

// POST /api/user-activity/init
router.post('/init', authenticateApiKeyWithSecret, async (req, res) => {
    try {
        const { utmSource, utmMedium, utmCampaign, referrer, locale, userAgent } = req.body;

        // Generate a unique referenceId
        let referenceId = generateReferenceId();
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 10) {
            const existing = await AppDataSource.getRepository(UserSession).findOne({ where: { referenceId } });
            if (!existing) {
                isUnique = true;
            } else {
                referenceId = generateReferenceId();
                attempts++;
            }
        }

        const session = AppDataSource.getRepository(UserSession).create({
            referenceId,
            utmSource,
            utmMedium,
            utmCampaign,
            referrer,
            locale,
            userAgent
        });

        const savedSession = await AppDataSource.getRepository(UserSession).save(session);

        res.status(201).json(successResponse({
            referenceId: savedSession.referenceId,
            sessionId: savedSession.id
        }));
    } catch (error: any) {
        console.error('Error init user session:', error);
        res.status(500).json(errorResponse('Failed to initialize session'));
    }
});

// POST /api/user-activity/track
router.post('/track', authenticateApiKeyWithSecret, async (req, res) => {
    try {
        const { referenceId, action, propertyId, url } = req.body;

        if (!referenceId || !action) {
            return res.status(400).json(errorResponse('referenceId and action are required'));
        }

        const session = await AppDataSource.getRepository(UserSession).findOne({
            where: { referenceId }
        });

        if (!session) {
            return res.status(404).json(errorResponse('Session not found'));
        }

        const activity = AppDataSource.getRepository(UserActivity).create({
            sessionId: session.id,
            referenceId,
            action,
            propertyId,
            url
        });

        await AppDataSource.getRepository(UserActivity).save(activity);

        res.status(201).json(successResponse({ success: true }));
    } catch (error: any) {
        console.error('Error track user activity:', error);
        res.status(500).json(errorResponse('Failed to track activity'));
    }
});

// GET /api/user-activity - List all sessions (for admin panel)
router.get('/', authenticateJWT, async (req: any, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const [sessions, total] = await AppDataSource.getRepository(UserSession).findAndCount({
            order: { createdAt: 'DESC' },
            skip,
            take: limit
        });

        res.json(successResponse({
            sessions,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        }));
    } catch (error: any) {
        console.error('Error fetching user sessions:', error);
        res.status(500).json(errorResponse('Failed to fetch user sessions'));
    }
});

// GET /api/user-activity/:referenceId - Get session details and activities
router.get('/:referenceId', authenticateJWT, async (req: any, res) => {
    try {
        const { referenceId } = req.params;

        const session = await AppDataSource.getRepository(UserSession).findOne({
            where: { referenceId }
        });

        if (!session) {
            return res.status(404).json(errorResponse('Session not found'));
        }

        const activities = await AppDataSource.getRepository(UserActivity).find({
            where: { referenceId },
            order: { createdAt: 'DESC' }
        });

        res.json(successResponse({
            session,
            activities
        }));
    } catch (error: any) {
        console.error('Error fetching session details:', error);
        res.status(500).json(errorResponse('Failed to fetch session details'));
    }
});

export default router;
