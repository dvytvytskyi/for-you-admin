import express from 'express';
import { AppDataSource } from '../config/database';
import { PortfolioItem } from '../entities/PortfolioItem';
import { User, UserRole } from '../entities/User';
import { authenticateJWT } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

// Middleware for authentication
router.use(authenticateJWT);

/**
 * GET /api/v1/projects/:id
 * Get structured data for an Off-plan project (linked to a portfolio item)
 */
router.get('/:id', async (req: any, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const portfolioRepo = AppDataSource.getRepository(PortfolioItem);

        // Find the portfolio item with property and area relations
        const item = await portfolioRepo.findOne({
            where: { id },
            relations: ['property', 'property.city', 'property.area']
        });

        if (!item) {
            return res.status(404).json(errorResponse('Project not found in your portfolio'));
        }

        // Security check: Only the owner or admin can access
        if (item.userId !== userId && userRole !== UserRole.ADMIN) {
            return res.status(403).json(errorResponse('Forbidden'));
        }

        const project = item.property;
        if (!project) {
            return res.status(404).json(errorResponse('Property details not found'));
        }

        // Prepare structured data
        const responseData = {
            id: project.id,
            name: project.name,
            location: `${project.area?.nameEn || ''}, ${project.city?.nameEn || ''}`,
            coordinates: {
                latitude: Number(project.latitude),
                longitude: Number(project.longitude)
            },
            gallery: project.photos || [],
            description: project.description,

            // Purchased Unit / Project Specification
            purchasedUnit: {
                floorPlans: item.floorPlans || [],
                projectPhotos: item.photos || [],
                documents: (Array.isArray(item.documents) ? item.documents : []).map(doc => ({
                    title: doc?.name || 'Untitled Document',
                    description: doc?.description || '',
                    fileUrl: doc?.url || ''
                }))
            },

            // Area data
            area: {
                name: project.area?.nameEn || 'N/A',
                description: project.area?.description?.description || '',
                photos: project.area?.images || []
            }
        };

        res.json(successResponse(responseData));

    } catch (error: any) {
        console.error('Error fetching project data:', error);
        res.status(500).json(errorResponse('Failed to fetch project data'));
    }
});

/**
 * GET /api/v1/projects/:id/pdf
 * Placeholder for PDF generation
 */
router.get('/:id/pdf', async (req: any, res) => {
    try {
        const { id } = req.params;
        // In the future, this will generate a real PDF
        res.json(successResponse({
            message: 'PDF generation endpoint',
            id,
            downloadUrl: `https://api.foryou.com/api/v1/projects/${id}/pdf/download` // Placeholder
        }));
    } catch (error: any) {
        res.status(500).json(errorResponse('Failed to generate PDF'));
    }
});

export default router;
