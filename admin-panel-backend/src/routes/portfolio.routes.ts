import express from 'express';
import { AppDataSource } from '../config/database';
import { PortfolioItem, OperationalStatus } from '../entities/PortfolioItem';
import { User, UserRole } from '../entities/User';
import { Property } from '../entities/Property';
import { authenticateJWT } from '../middleware/auth';
import { Document, DocumentCategory } from '../entities/Document';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

// Middleware for authentication
router.use(authenticateJWT);

router.use((req, res, next) => {
    console.log(`[Portfolio] ${req.method} ${req.originalUrl}`);
    next();
});

/**
 * Helper to link uploaded documents to a property entity in the documents table
 */
async function linkDocumentsToProperty(documents: any[], propertyId: string) {
    if (!documents || !Array.isArray(documents) || !propertyId) return;

    try {
        const docRepo = AppDataSource.getRepository(Document);
        for (const doc of documents) {
            if (doc.id) {
                await docRepo.update(doc.id, {
                    entityType: DocumentCategory.PROPERTY,
                    entityId: propertyId
                });
            }
        }
    } catch (error) {
        console.error('[Portfolio] Error linking documents:', error);
    }
}

/**
 * GET /api/portfolio/:id/pdf
 * Generate PDF analytics report for portfolio item
 */
router.get('/:id/pdf', async (req: any, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;
        const currentUserRole = req.user?.role;

        const portfolioRepo = AppDataSource.getRepository(PortfolioItem);
        let item = await portfolioRepo.findOne({
            where: { id },
            relations: ['property', 'property.city', 'property.area']
        });

        // Fallback: if not found by PortfolioItem ID, try as Property ID for current user
        if (!item && currentUserId) {
            item = await portfolioRepo.findOne({
                where: { propertyId: id, userId: currentUserId },
                relations: ['property', 'property.city', 'property.area']
            });
        }

        if (!item) {
            return res.status(404).json(errorResponse('Portfolio item not found. Ensure this property is in your portfolio.'));
        }

        // Security check
        if (currentUserRole !== UserRole.ADMIN && item.userId !== currentUserId) {
            return res.status(403).json(errorResponse('Forbidden'));
        }

        // Calculate analytics (if strictly needed, though template calls item.roi/appreciation if they are getters, 
        // passing the entity instance usually preserves them. But let's be explicit like the main GET)
        const purchasePrice = Number(item.purchasePrice) || 0;
        const annualCashFlow = Number(item.annualCashFlow) || 0;
        const estimatedValue = Number(item.estimatedSellingValue) || 0;

        const roi = purchasePrice > 0 ? (annualCashFlow / purchasePrice) * 100 : 0;
        const appreciation = purchasePrice > 0 ? ((estimatedValue - purchasePrice) / purchasePrice) * 100 : 0;

        const itemData = {
            ...item,
            purchasePrice, // ensure number
            annualCashFlow,
            estimatedSellingValue: estimatedValue,
            roi: Number(roi.toFixed(2)),
            appreciation: Number(appreciation.toFixed(2))
        };

        const { PdfService } = require('../services/pdf.service');
        const pdfService = new PdfService();
        const pdfBuffer = await pdfService.generatePortfolioAnalytics(itemData);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="portfolio-analytics-${item.unitName || 'unit'}.pdf"`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Error generating PDF:', error);
        res.status(500).json(errorResponse('Failed to generate PDF'));
    }
});

/**
 * GET /api/portfolio/:id/presentation
 * Generate PDF property presentation for portfolio item
 */
router.get('/:id/presentation', async (req: any, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;
        const currentUserRole = req.user?.role;

        const portfolioRepo = AppDataSource.getRepository(PortfolioItem);
        let item = await portfolioRepo.findOne({
            where: { id },
            relations: ['property', 'property.city', 'property.area', 'property.developer', 'property.facilities']
        });

        // Fallback: if not found by PortfolioItem ID, try as Property ID for current user
        if (!item && currentUserId) {
            item = await portfolioRepo.findOne({
                where: { propertyId: id, userId: currentUserId },
                relations: ['property', 'property.city', 'property.area', 'property.developer', 'property.facilities']
            });
        }

        if (!item) {
            return res.status(404).json(errorResponse('Portfolio item not found. Ensure this property is in your portfolio.'));
        }

        // Security check
        if (currentUserRole !== UserRole.ADMIN && item.userId !== currentUserId) {
            return res.status(403).json(errorResponse('Forbidden'));
        }

        const property = item.property;
        if (!property) {
            return res.status(404).json(errorResponse('Property data not found for this item'));
        }

        // Prepare data for presentation template
        let areaName = property.area?.nameEn || '';
        if (property.area && property.city) {
            areaName = `${property.area.nameEn}, ${property.city.nameEn}`;
        }

        // Ensure we have enough photos (duplicate if needed for layout, though template should handle it ideally)
        let presentationPhotos = [...(item.photos || []), ...(property.photos || [])];
        if (presentationPhotos.length > 0 && presentationPhotos.length < 5) {
            // Fill up to at least 5 for better layout if possible
            while (presentationPhotos.length < 5) {
                presentationPhotos = [...presentationPhotos, ...presentationPhotos];
            }
        }
        presentationPhotos = presentationPhotos.slice(0, 25); // Cap to avoid huge PDFs

        const presentationData = {
            ...property,
            name: item.unitName ? `${property.name} - ${item.unitName}` : property.name, // Customize title
            area: areaName,
            city: property.city?.nameEn || '',
            developer: property.developer?.name || '',
            type: item.unitType || property.propertyType,
            completion: item.operationalStatus || 'Ready',
            price: item.purchasePrice ? `$${Number(item.purchasePrice).toLocaleString()}` : null,
            size: item.size ? Number(item.size).toLocaleString() : null,
            facilities: property.facilities || [],
            photos: presentationPhotos,
            description: property.description
        };

        // Static Agent Data (could be dynamic based on logged in admin or assigned agent)
        const agent = {
            name: 'For You Real Estate',
            phone: item.advisorWhatsapp || '+971 50 123 4567',
            email: 'info@foryou.ae',
            photo: 'https://ui-avatars.com/api/?name=For+You&background=D4AF37&color=fff&size=200'
        };

        const { PdfService } = require('../services/pdf.service');
        const pdfService = new PdfService();
        const pdfBuffer = await pdfService.generatePropertyPresentation(presentationData, agent);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="presentation-${item.unitName || 'unit'}.pdf"`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Error generating Presentation PDF:', error);
        res.status(500).json(errorResponse('Failed to generate Presentation PDF'));
    }
});





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

        // Step 3: Link documents in the documents table to this property
        if (documents && propertyId) {
            await linkDocumentsToProperty(documents, propertyId);
        }

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

        // Step 3: Link documents in the documents table to this property
        if (updateData.documents && item.propertyId) {
            await linkDocumentsToProperty(updateData.documents, item.propertyId);
        }

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
