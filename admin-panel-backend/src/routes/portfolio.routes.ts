import express from 'express';
import { AppDataSource } from '../config/database';
import { PortfolioItem, OperationalStatus } from '../entities/PortfolioItem';
import { User, UserRole } from '../entities/User';
import { Property } from '../entities/Property';
import { authenticateJWT } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

// Middleware for authentication
router.use(authenticateJWT);

/**
 * GET /api/portfolio/:userId
 * Get user's portfolio with analytics
 */
router.get('/:userId', async (req: any, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        const currentUserRole = req.user?.role;

        // Security: only admin can view any portfolio, or user can view their own
        if (currentUserRole !== UserRole.ADMIN && currentUserId !== userId) {
            return res.status(403).json(errorResponse('Forbidden'));
        }

        const portfolioRepo = AppDataSource.getRepository(PortfolioItem);
        const items = await portfolioRepo.find({
            where: { userId },
            relations: ['property', 'property.city', 'property.area'],
            order: { createdAt: 'DESC' }
        });

        // Analytics calculation
        let totalPurchasePrice = 0;
        let totalAnnualCashFlow = 0;
        let totalEstimatedSellingValue = 0;

        const itemsWithAnalytics = items.map(item => {
            const purchasePrice = Number(item.purchasePrice) || 0;
            const annualCashFlow = Number(item.annualCashFlow) || 0;
            const estimatedValue = Number(item.estimatedSellingValue) || 0;

            totalPurchasePrice += purchasePrice;
            totalAnnualCashFlow += annualCashFlow;
            totalEstimatedSellingValue += estimatedValue;

            const roi = purchasePrice > 0 ? (annualCashFlow / purchasePrice) * 100 : 0;
            const appreciation = purchasePrice > 0 ? ((estimatedValue - purchasePrice) / purchasePrice) * 100 : 0;

            return {
                ...item,
                roi: Number(roi.toFixed(2)),
                appreciation: Number(appreciation.toFixed(2))
            };
        });

        const totalAppreciationPerc = totalPurchasePrice > 0
            ? ((totalEstimatedSellingValue - totalPurchasePrice) / totalPurchasePrice) * 100
            : 0;

        const analytics = {
            totalPurchasePrice,
            totalAnnualCashFlow,
            annualCashFlowIn3Years: totalAnnualCashFlow * 3,
            totalEstimatedSellingValue,
            totalAppreciationPercentage: Number(totalAppreciationPerc.toFixed(2)),
            itemCount: items.length
        };

        res.json(successResponse({
            items: itemsWithAnalytics,
            analytics
        }));

    } catch (error: any) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json(errorResponse('Failed to fetch portfolio'));
    }
});

/**
 * POST /api/portfolio/:userId
 * Create new portfolio item (Admin only)
 */
router.post('/:userId', async (req: any, res) => {
    try {
        const { userId } = req.params;
        const currentUserRole = req.user?.role;

        if (currentUserRole !== UserRole.ADMIN) {
            return res.status(403).json(errorResponse('Only administrators can manage portfolios'));
        }

        const {
            propertyId,
            unitName,
            unitType,
            purchasePrice,
            size,
            amenities,
            photos,
            floorPlans,
            operationalStatus,
            annualCashFlow,
            estimatedSellingValue,
            plannedSaleDate,
            advisorWhatsapp,
            documents
        } = req.body;

        if (!propertyId) {
            return res.status(400).json(errorResponse('Property ID is required'));
        }

        const portfolioRepo = AppDataSource.getRepository(PortfolioItem);
        const newItem = portfolioRepo.create({
            userId,
            propertyId,
            unitName,
            unitType,
            purchasePrice: purchasePrice || 0,
            size,
            amenities,
            photos,
            floorPlans,
            operationalStatus: operationalStatus || OperationalStatus.UNDER_CONSTRUCTION,
            annualCashFlow: annualCashFlow || 0,
            estimatedSellingValue: estimatedSellingValue || 0,
            plannedSaleDate,
            advisorWhatsapp,
            documents
        });

        await portfolioRepo.save(newItem);
        res.status(201).json(successResponse(newItem, 'Portfolio item added'));

    } catch (error: any) {
        console.error('Error creating portfolio item:', error);
        res.status(500).json(errorResponse('Failed to add portfolio item'));
    }
});

/**
 * PATCH /api/portfolio/:id
 * Update portfolio item (Admin only)
 */
router.patch('/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const currentUserRole = req.user?.role;

        if (currentUserRole !== UserRole.ADMIN) {
            return res.status(403).json(errorResponse('Only administrators can manage portfolios'));
        }

        const portfolioRepo = AppDataSource.getRepository(PortfolioItem);
        const item = await portfolioRepo.findOne({ where: { id } });

        if (!item) {
            return res.status(404).json(errorResponse('Portfolio item not found'));
        }

        const updateData = req.body;
        // Don't allow changing IDs manually through PATCH if not needed, but here we can be flexible
        portfolioRepo.merge(item, updateData);

        await portfolioRepo.save(item);
        res.json(successResponse(item, 'Portfolio item updated'));

    } catch (error: any) {
        console.error('Error updating portfolio item:', error);
        res.status(500).json(errorResponse('Failed to update portfolio item'));
    }
});

/**
 * DELETE /api/portfolio/:id
 * Delete portfolio item (Admin only)
 */
router.delete('/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const currentUserRole = req.user?.role;

        if (currentUserRole !== UserRole.ADMIN) {
            return res.status(403).json(errorResponse('Only administrators can manage portfolios'));
        }

        const portfolioRepo = AppDataSource.getRepository(PortfolioItem);
        const result = await portfolioRepo.delete(id);

        if (result.affected === 0) {
            return res.status(404).json(errorResponse('Portfolio item not found'));
        }

        res.json(successResponse(null, 'Portfolio item removed'));

    } catch (error: any) {
        console.error('Error deleting portfolio item:', error);
        res.status(500).json(errorResponse('Failed to delete portfolio item'));
    }
});

export default router;
