import express from 'express';
import { AppDataSource } from '../config/database';
import { Investment, InvestmentStatus } from '../entities/Investment';
import { Property } from '../entities/Property';
import { User, UserRole } from '../entities/User';
import { authenticateJWT, authenticateAPIKey } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

// Middleware для захищених endpoints (тільки для адмінів/інвесторів)
const requireAuth = authenticateJWT;

// POST /api/investments/public - Create investment (public, для сайту/додатку)
router.post('/public', async (req, res) => {
  try {
    const { propertyId, amount, date, notes, userEmail, userPhone, userFirstName, userLastName, referenceId } = req.body;

    if (!propertyId || !amount || !date) {
      return res.status(400).json(errorResponse('Property ID, amount, and date are required'));
    }

    // Clean amount (remove commas, spaces, etc.)
    const cleanAmount = typeof amount === 'string' ? amount.replace(/[^\d.]/g, '') : amount;
    const parsedAmount = parseFloat(cleanAmount);
    
    // Use the verified system guest user UUID
    const SYSTEM_GUEST_ID = '6d5c7d81-18ee-4373-ab61-3c51ccfeb7c2';

    const investment = AppDataSource.getRepository(Investment).create({
      userId: SYSTEM_GUEST_ID,
      propertyId,
      amount: parsedAmount,
      status: InvestmentStatus.PENDING,
      date: new Date(date),
      notes: notes || `Contact: ${userEmail || ''} ${userPhone || ''} | ${userFirstName || ''} ${userLastName || ''}`,
      referenceId,
    });

    const saved = await AppDataSource.getRepository(Investment).save(investment);

    try {
      // Fetch property details for project link
      const property = await AppDataSource.getRepository(Property).findOne({
        where: { id: propertyId }
      });

      const { AmoCrmService } = await import('../services/amo-crm.service');
      const amoCrmService = new AmoCrmService();
      await amoCrmService.submitEnquiryToAmo({
        name: `${userFirstName || ''} ${userLastName || ''}`.trim() || 'Investment Applicant',
        email: userEmail || '',
        phone: userPhone || '',
        message: notes || 'Public Investment Request',
        source: 'Investment Request',
        price: parsedAmount,
        additionalInfo: {
          propertyId,
          referenceId,
          investmentId: saved.id,
          projectName: property?.nameEn || property?.name || 'Unknown Project',
          projectSlug: property?.slug
        },
      });
    } catch (amoError) {
      console.error('Failed to forward investment to AmoCRM:', amoError);
    }

    // Return saved investment without property relations to avoid schema mismatch on Property.views column
    res.status(201).json(successResponse(saved));
  } catch (error) {
    console.error('Error creating public investment:', error);
    res.status(500).json(errorResponse('Failed to create investment'));
  }
});

// GET /api/investments - Get all investments for current user
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    // Перевірка чи користувач Investor або Admin
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(401).json(errorResponse('User not found'));
    }

    if (user.role !== UserRole.INVESTOR && user.role !== UserRole.ADMIN) {
      return res.status(403).json(errorResponse('Only investors can view investments'));
    }

    const investments = await AppDataSource.getRepository(Investment).find({
      where: { userId },
      relations: ['property', 'property.country', 'property.city', 'property.area', 'property.developer'],
      order: { createdAt: 'DESC' },
    });

    res.json(successResponse(investments));
  } catch (error: any) {
    console.error('Error fetching investments:', error);
    res.status(500).json(errorResponse('Failed to fetch investments'));
  }
});

// POST /api/investments - Create new investment (для зареєстрованих користувачів)
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    // Перевірка чи користувач Investor
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(401).json(errorResponse('User not found'));
    }

    if (user.role !== UserRole.INVESTOR && user.role !== UserRole.ADMIN) {
      return res.status(403).json(errorResponse('Only investors can create investments'));
    }

    const { propertyId, amount, status, date, notes, referenceId } = req.body;

    if (!propertyId || !amount || !date) {
      return res.status(400).json(errorResponse('Property ID, amount, and date are required'));
    }

    // Перевірка чи property існує
    const property = await AppDataSource.getRepository(Property).findOne({
      where: { id: propertyId },
    });

    if (!property) {
      return res.status(404).json(errorResponse('Property not found'));
    }

    const investment = AppDataSource.getRepository(Investment).create({
      userId,
      propertyId,
      amount: parseFloat(amount),
      status: status || InvestmentStatus.PENDING,
      date: new Date(date),
      notes,
      referenceId,
    });

    const saved = await AppDataSource.getRepository(Investment).save(investment);

    const investmentWithProperty = await AppDataSource.getRepository(Investment).findOne({
      where: { id: saved.id },
      relations: ['property', 'property.country', 'property.city', 'property.area', 'property.developer'],
    });

    res.status(201).json(successResponse(investmentWithProperty));
  } catch (error: any) {
    console.error('Error creating investment:', error);
    res.status(500).json(errorResponse('Failed to create investment'));
  }
});

// GET /api/investments/:id - Get investment details
router.get('/:id', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const investment = await AppDataSource.getRepository(Investment).findOne({
      where: { id, userId },
      relations: ['property', 'property.country', 'property.city', 'property.area', 'property.developer', 'property.facilities'],
    });

    if (!investment) {
      return res.status(404).json(errorResponse('Investment not found'));
    }

    res.json(successResponse(investment));
  } catch (error: any) {
    console.error('Error fetching investment:', error);
    res.status(500).json(errorResponse('Failed to fetch investment'));
  }
});

export default router;

