import express from 'express';
import { AppDataSource } from '../config/database';
import { AmoCrmLead } from '../entities/AmoCrmLead';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

/**
 * GET /api/v1/leads
 * Отримати leads з AMO CRM (для мобільного додатку)
 * Fallback endpoint коли main backend недоступний
 */
router.get(
  '/',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const leadRepo = AppDataSource.getRepository(AmoCrmLead);
      const [leads, total] = await leadRepo.findAndCount({
        order: { updatedAt: 'DESC' },
        skip,
        take: limit,
      });

      // Трансформуємо дані для сумісності з main backend форматом
      const transformedLeads = leads.map(lead => ({
        id: lead.amoLeadId,
        name: lead.name,
        price: lead.price,
        status_id: lead.statusId,
        pipeline_id: lead.pipelineId,
        responsible_user_id: lead.responsibleUserId,
        contact_id: lead.amoContactId,
        created_at: lead.createdAtAmo,
        updated_at: lead.updatedAtAmo,
        custom_fields: lead.customFields,
        embedded: lead.embedded,
      }));

      return res.json({
        success: true,
        data: transformedLeads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch leads'));
    }
  },
);

/**
 * GET /api/v1/leads/:id
 * Отримати конкретний lead по ID
 */
router.get(
  '/:id',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const leadRepo = AppDataSource.getRepository(AmoCrmLead);
      
      const lead = await leadRepo.findOne({
        where: { amoLeadId: parseInt(id) },
      });

      if (!lead) {
        return res.status(404).json(errorResponse('Lead not found'));
      }

      // Трансформуємо дані для сумісності з main backend форматом
      const transformedLead = {
        id: lead.amoLeadId,
        name: lead.name,
        price: lead.price,
        status_id: lead.statusId,
        pipeline_id: lead.pipelineId,
        responsible_user_id: lead.responsibleUserId,
        contact_id: lead.amoContactId,
        created_at: lead.createdAtAmo,
        updated_at: lead.updatedAtAmo,
        custom_fields: lead.customFields,
        embedded: lead.embedded,
        raw_data: lead.rawData,
      };

      return res.json({
        success: true,
        data: transformedLead,
      });
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch lead'));
    }
  },
);

export default router;

