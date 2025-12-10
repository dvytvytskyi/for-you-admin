import express from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { AmoCrmLead } from '../entities/AmoCrmLead';
import { AmoCrmContact } from '../entities/AmoCrmContact';
import { AmoCrmStage, LeadStatus } from '../entities/AmoCrmStage';
import { User, UserRole } from '../entities/User';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

/**
 * Витягнути email та телефон з custom fields або embedded контакту
 */
function extractContactInfo(lead: AmoCrmLead, contact?: AmoCrmContact): { email?: string; phone?: string; name?: string } {
  // Спочатку пробуємо з embedded контакту
  if (lead.embedded?.contacts && lead.embedded.contacts.length > 0) {
    const contactData = lead.embedded.contacts[0];
    if (contactData.email) return { email: contactData.email, phone: contactData.phone, name: contactData.name };
  }

  // Потім з контакту з БД
  if (contact) {
    return {
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      name: contact.name || contact.firstName && contact.lastName 
        ? `${contact.firstName} ${contact.lastName}`.trim() 
        : contact.name,
    };
  }

  // Нарешті з custom fields lead
  if (lead.customFields) {
    const emailField = Array.isArray(lead.customFields) 
      ? lead.customFields.find((f: any) => f.field_code === 'EMAIL' || f.field_name?.toLowerCase().includes('email'))
      : null;
    const phoneField = Array.isArray(lead.customFields)
      ? lead.customFields.find((f: any) => f.field_code === 'PHONE' || f.field_name?.toLowerCase().includes('phone'))
      : null;

    return {
      email: emailField?.values?.[0]?.value as string | undefined,
      phone: phoneField?.values?.[0]?.value as string | undefined,
    };
  }

  return {};
}

/**
 * Мапінг статусу AMO CRM на наші статуси
 */
async function mapStatus(statusId?: number): Promise<'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST' | null> {
  if (!statusId) return null;

  try {
    // Перевірка ініціалізації БД
    if (!AppDataSource.isInitialized) {
      console.warn('Database not initialized in mapStatus');
      return null;
    }

    const stageRepo = AppDataSource.getRepository(AmoCrmStage);
    const stage = await stageRepo.findOne({
      where: { amoStageId: statusId },
    });

    if (!stage || !stage.mappedStatus) return null;

    // Мапінг LeadStatus enum на строкові значення
    switch (stage.mappedStatus) {
      case LeadStatus.NEW:
        return 'NEW';
      case LeadStatus.IN_PROGRESS:
        return 'IN_PROGRESS';
      case LeadStatus.QUALIFIED:
        return 'QUALIFIED';
      case LeadStatus.CLOSED_WON:
        return 'CLOSED_WON';
      case LeadStatus.CLOSED_LOST:
        return 'CLOSED_LOST';
      default:
        return null;
    }
  } catch (error: any) {
    console.error('Error mapping status:', error);
    return null; // Повертаємо null при помилці, щоб не ламати весь запит
  }
}

/**
 * GET /api/v1/leads
 * Отримати список leads з пагінацією та фільтрацією
 * 
 * Query параметри:
 * - page?: number (default: 1)
 * - limit?: number (default: 100, max: 100)
 * - status?: 'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST'
 * - pipelineId?: number - ID пайплайну з AMO CRM (наприклад: 8696950, 8550470)
 * - stageId?: number - ID стадії з AMO CRM (amoStageId, наприклад: 70457446, 70697150)
 * - brokerId?: string (UUID) - ID брокера з нашої системи
 * - clientId?: string (UUID) - ID клієнта (не використовується для AMO CRM)
 * - propertyId?: string (UUID) - ID нерухомості (не використовується для AMO CRM)
 */
router.get(
  '/',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      // Перевірка ініціалізації БД
      if (!AppDataSource.isInitialized) {
        console.error('Database not initialized');
        return res.status(500).json(errorResponse('Database connection not initialized'));
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      // Параметри пагінації
      const rawLimit = req.query.limit as string | undefined;
      const parsedLimit = rawLimit ? parseInt(rawLimit) : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parsedLimit || 100, 100); // Дефолт 100, макс 100
      const skip = (page - 1) * limit;

      // Фільтри
      const status = req.query.status as 'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST' | undefined;
      const pipelineId = req.query.pipelineId ? parseInt(req.query.pipelineId as string) : undefined;
      const stageId = req.query.stageId ? parseInt(req.query.stageId as string) : undefined;
      const brokerId = req.query.brokerId as string | undefined;

      // Логування параметрів запиту для діагностики
      console.log('📊 GET /api/v1/leads - Request params:', {
        rawQueryLimit: rawLimit,
        parsedLimit,
        finalLimit: limit,
        page,
        skip,
        status,
        pipelineId,
        stageId,
        brokerId,
        userId: user.id,
        userRole: user.role,
        fullUrl: req.url,
        queryString: req.query,
      });

      // Побудова запиту
      const leadRepo = AppDataSource.getRepository(AmoCrmLead);
      const queryBuilder = leadRepo.createQueryBuilder('lead');

      // Фільтр по pipelineId (ID пайплайну з AMO CRM)
      if (pipelineId && !isNaN(pipelineId)) {
        // Використовуємо правильну назву колонки в БД (pipeline_id, не pipelineId)
        queryBuilder.andWhere('lead.pipeline_id = :pipelineId', { pipelineId });
      }

      // Фільтр по stageId (ID стадії з AMO CRM)
      if (stageId && !isNaN(stageId)) {
        // Використовуємо правильну назву колонки в БД (status_id, не statusId)
        queryBuilder.andWhere('lead.status_id = :stageId', { stageId });
      }

      // Фільтр по статусу (через stages) - працює тільки якщо не вказано stageId
      if (status && !stageId) {
        const stageRepo = AppDataSource.getRepository(AmoCrmStage);
        const stages = await stageRepo.find({
          where: { mappedStatus: status as any },
        });
        if (stages.length > 0) {
          const statusIds = stages.map(s => s.amoStageId);
          // Використовуємо правильну назву колонки в БД (status_id, не statusId)
          queryBuilder.andWhere('lead.status_id IN (:...statusIds)', { statusIds });
        } else {
          // Якщо немає stages з таким статусом, повертаємо порожній результат
          return res.json({
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          });
        }
      }

      // Фільтр по brokerId (через responsibleUserId, якщо brokerId відповідає AMO user)
      // Це потребує мапінгу між нашими користувачами та AMO користувачами
      // Поки що пропускаємо цей фільтр для AMO CRM leads

      // Якщо користувач - брокер, показуємо тільки його leads
      // (потрібно мапінг між User.id та AmoCrmUser.amoUserId)
      if (user.role === UserRole.BROKER) {
        // TODO: Реалізувати мапінг між User та AmoCrmUser
        // Поки що показуємо всі leads
      }

      // Підрахунок загальної кількості (БЕЗ limit та skip)
      const total = await queryBuilder.getCount();

      // Отримання даних з пагінацією
      // Використовуємо правильну назву колонки в БД (updated_at, не updatedAt)
      const leads = await queryBuilder
        .orderBy('lead.updated_at', 'DESC')
        .skip(skip)
        .take(limit) // ✅ Використовуємо параметр limit з запиту
        .getMany();

      // Логування результатів запиту для діагностики
      console.log('📊 GET /api/v1/leads - Query result:', {
        total,
        requestedLimit: limit,
        requestedPage: page,
        skip,
        returnedLeads: leads.length,
        totalPages: Math.ceil(total / limit),
        sqlQuery: queryBuilder.getSql(),
        sqlParameters: queryBuilder.getParameters(),
      });

      // Попередження, якщо повертається менше лідів, ніж запитувалось
      if (leads.length < limit && leads.length < total) {
        console.warn(`⚠️ GET /api/v1/leads - Warning: Requested ${limit} leads, but only ${leads.length} returned (total: ${total})`);
      }

      // Отримуємо контакти для leads
      const contactIds = leads.map(l => l.amoContactId).filter((id): id is number => id !== undefined && id !== null);
      const contactsMap = new Map<number, AmoCrmContact>();
      if (contactIds.length > 0) {
        const contactRepo = AppDataSource.getRepository(AmoCrmContact);
        const contacts = await contactRepo.find({
          where: { amoContactId: In(contactIds) },
        });
        contacts.forEach(c => contactsMap.set(c.amoContactId, c));
      }

      // Трансформація даних для сумісності з main backend форматом
      const transformedLeads = await Promise.all(leads.map(async (lead) => {
        const contact = lead.amoContactId ? contactsMap.get(lead.amoContactId) : undefined;
        const contactInfo = extractContactInfo(lead, contact);
        const mappedStatus = await mapStatus(lead.statusId);

        return {
          id: lead.id, // Використовуємо UUID з нашої БД
          guestName: contactInfo.name || lead.name || null,
          guestPhone: contactInfo.phone || null,
          guestEmail: contactInfo.email || null,
          status: mappedStatus || 'NEW',
          price: lead.price ? Number(lead.price) : null,
          amoLeadId: lead.amoLeadId || null,
          pipelineId: lead.pipelineId || null, // ID пайплайну з AMO CRM
          stageId: lead.statusId || null, // ID стадії з AMO CRM (status_id в БД)
          responsibleUserId: lead.responsibleUserId || null,
          createdAt: lead.createdAt.toISOString(),
          updatedAt: lead.updatedAt.toISOString(),
          // Додаткові поля для сумісності
          brokerId: null, // Не маємо мапінгу з AMO users
          clientId: null,
          propertyId: null,
        };
      }));

      // Відповідь у форматі main backend
      return res.json({
        data: transformedLeads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch leads'));
    }
  },
);

/**
 * GET /api/v1/leads/:id
 * Отримати конкретний lead по ID (UUID з нашої БД або amoLeadId)
 */
router.get(
  '/:id',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      const { id } = req.params;
      const leadRepo = AppDataSource.getRepository(AmoCrmLead);
      
      // Спробуємо знайти по UUID (наш ID)
      let lead = await leadRepo.findOne({
        where: { id },
      });

      // Якщо не знайдено, пробуємо по amoLeadId
      if (!lead && !isNaN(parseInt(id))) {
        lead = await leadRepo.findOne({
          where: { amoLeadId: parseInt(id) },
        });
      }

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found',
        });
      }

      // Перевірка доступу (брокер може бачити тільки свої leads)
      // TODO: Реалізувати мапінг між User та AmoCrmUser для перевірки
      if (user.role === UserRole.BROKER) {
        // Поки що дозволяємо всім брокерам бачити всі leads
        // Потрібно додати мапінг між User.id та AmoCrmUser.amoUserId
      }

      // Отримуємо контакт
      let contact: AmoCrmContact | undefined;
      if (lead.amoContactId) {
        const contactRepo = AppDataSource.getRepository(AmoCrmContact);
        const foundContact = await contactRepo.findOne({
          where: { amoContactId: lead.amoContactId },
        });
        contact = foundContact || undefined;
      }

      const contactInfo = extractContactInfo(lead, contact);
      const mappedStatus = await mapStatus(lead.statusId);

      // Трансформація даних
      const transformedLead = {
        id: lead.id,
        guestName: contactInfo.name || lead.name || null,
        guestPhone: contactInfo.phone || null,
        guestEmail: contactInfo.email || null,
        status: mappedStatus || 'NEW',
        price: lead.price ? Number(lead.price) : null,
        amoLeadId: lead.amoLeadId || null,
        pipelineId: lead.pipelineId || null, // ID пайплайну з AMO CRM
        stageId: lead.statusId || null, // ID стадії з AMO CRM (status_id в БД)
        responsibleUserId: lead.responsibleUserId || null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        brokerId: null, // Не маємо мапінгу з AMO users
        clientId: null,
        propertyId: null,
        // Додаткові поля з AMO CRM
        customFields: lead.customFields,
        embedded: lead.embedded,
      };

      return res.json(transformedLead);
    } catch (error: any) {
      console.error('Error fetching lead:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch lead',
        error: error.message,
      });
    }
  },
);

export default router;

