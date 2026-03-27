import express from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { AmoCrmLead } from '../entities/AmoCrmLead';
import { AmoCrmContact } from '../entities/AmoCrmContact';
import { AmoCrmStage, LeadStatus } from '../entities/AmoCrmStage';
import { User, UserRole } from '../entities/User';
import { authenticateJWT, AuthRequest, requireBrokerOrAdmin } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { AmoCrmService } from '../services/amo-crm.service';

const router = express.Router();
const amoCrmService = new AmoCrmService();

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
 * Синхронний мапінг статусу AMO CRM на наші статуси (використовує попередньо завантажені стадії)
 */
function mapStatusSync(statusId: number | undefined, stagesMap: Map<number, AmoCrmStage>): 'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST' | null {
  if (!statusId) return null;
  const stage = stagesMap.get(statusId);
  if (!stage || !stage.mappedStatus) return null;

  switch (stage.mappedStatus) {
    case LeadStatus.NEW: return 'NEW';
    case LeadStatus.IN_PROGRESS: return 'IN_PROGRESS';
    case LeadStatus.QUALIFIED: return 'QUALIFIED';
    case LeadStatus.CLOSED_WON: return 'CLOSED_WON';
    case LeadStatus.CLOSED_LOST: return 'CLOSED_LOST';
    default: return null;
  }
}

/**
 * Отримати реальну назву стадії з AMO CRM
 */
function getStageNameSync(statusId: number | undefined, stagesMap: Map<number, AmoCrmStage>): string | null {
  if (!statusId) return null;
  const stage = stagesMap.get(statusId);
  return stage ? stage.name : null;
}

/**
 * Мапінг статусу AMO CRM на наші статуси (залишено для зворотної сумісності, якщо потрібно)
 */
async function mapStatus(statusId?: number): Promise<'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST' | null> {
  if (!statusId) return null;
  try {
    if (!AppDataSource.isInitialized) return null;
    const stageRepo = AppDataSource.getRepository(AmoCrmStage);
    const stage = await stageRepo.findOne({ where: { amoStageId: statusId } });
    if (!stage) return null;

    // Створюємо тимчасову мапу для використання спільної логіки
    const tempMap = new Map<number, AmoCrmStage>();
    tempMap.set(statusId, stage);
    return mapStatusSync(statusId, tempMap);
  } catch (error) {
    return null;
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
      if (user.role === UserRole.BROKER) {
        const currentUserRepo = AppDataSource.getRepository(User);
        const currentUser = await currentUserRepo.findOne({
          where: { id: user.id },
          relations: ['amoCrmUser'],
        });

        if (currentUser?.amoCrmUser?.amoUserId) {
          queryBuilder.andWhere('lead.responsible_user_id = :amoUserId', {
            amoUserId: currentUser.amoCrmUser.amoUserId
          });
          console.log(`🔒 Filtering leads for broker ${user.id} (Amo ID: ${currentUser.amoCrmUser.amoUserId})`);
        } else {
          console.warn(`⚠️ Broker ${user.id} has no linked AmoCrmUser, showing no leads.`);
          // Якщо брокер не прив'язаний до AmoCRM, він не повинен бачити нічого
          return res.json({
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          });
        }
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

      // Попередньо завантажуємо всі стадії для мапінгу (оптимізація)
      const stageRepo = AppDataSource.getRepository(AmoCrmStage);
      const allStages = await stageRepo.find();
      const stagesMap = new Map<number, AmoCrmStage>();
      allStages.forEach(s => stagesMap.set(s.amoStageId, s));

      // Трансформація даних для сумісності з main backend форматом
      const transformedLeads = leads.map((lead) => {
        const contact = lead.amoContactId ? contactsMap.get(lead.amoContactId) : undefined;
        const contactInfo = extractContactInfo(lead, contact);
        const mappedStatus = mapStatusSync(lead.statusId, stagesMap);
        const statusName = getStageNameSync(lead.statusId, stagesMap);

        return {
          id: lead.id, // Використовуємо UUID з нашої БД
          guestName: contactInfo.name || lead.name || null,
          guestPhone: contactInfo.phone || null,
          guestEmail: contactInfo.email || null,
          status: mappedStatus || 'NEW',
          statusName: statusName || null, // Додаємо реальну назву стадії
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
      });

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
      if (user.role === UserRole.BROKER) {
        const currentUserRepo = AppDataSource.getRepository(User);
        const currentUser = await currentUserRepo.findOne({
          where: { id: user.id },
          relations: ['amoCrmUser'],
        });

        if (!currentUser?.amoCrmUser?.amoUserId || lead.responsibleUserId !== currentUser.amoCrmUser.amoUserId) {
          return res.status(403).json(errorResponse('You do not have permission to view this lead'));
        }
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

      // Отримуємо стадії для детального перегляду
      const stageRepo = AppDataSource.getRepository(AmoCrmStage);
      const allStages = await stageRepo.find();
      const stagesMap = new Map<number, AmoCrmStage>();
      allStages.forEach(s => stagesMap.set(s.amoStageId, s));

      const contactInfo = extractContactInfo(lead, contact);
      const mappedStatus = mapStatusSync(lead.statusId, stagesMap);
      const statusName = getStageNameSync(lead.statusId, stagesMap);

      // Трансформація даних
      const transformedLead = {
        id: lead.id,
        guestName: contactInfo.name || lead.name || null,
        guestPhone: contactInfo.phone || null,
        guestEmail: contactInfo.email || null,
        status: mappedStatus || 'NEW',
        statusName: statusName || null, // Додаємо реальну назву стадії
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

/**
 * POST /api/v1/leads
 * Create lead in AmoCRM
 */
router.post(
  '/',
  authenticateJWT,
  requireBrokerOrAdmin,
  async (req: AuthRequest, res) => {
    try {
      const leadData = req.body;
      const leadId = await amoCrmService.createLead(leadData);

      // Optionally sync back immediately
      const amoLead = await amoCrmService.getLead(leadId).catch(() => null);
      if (amoLead) {
        await amoCrmService.saveLeadLocally(amoLead);
      }

      return res.status(201).json(successResponse({ amoLeadId: leadId }, 'Lead created successfully'));
    } catch (error: any) {
      console.error('Error creating lead:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to create lead'));
    }
  }
);

/**
 * POST /api/v1/leads/:id/notes
 * Add note to lead
 */
router.post(
  '/:id/notes',
  authenticateJWT,
  requireBrokerOrAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json(errorResponse('Text is required'));
      }

      await amoCrmService.addNote(parseInt(id), 'leads', text);
      return res.json(successResponse(null, 'Note added successfully'));
    } catch (error: any) {
      console.error('Error adding note:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to add note'));
    }
  }
);

/**
 * POST /api/v1/leads/:id/tasks
 * Add task to lead
 */
router.post(
  '/:id/tasks',
  authenticateJWT,
  requireBrokerOrAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { text, complete_till, responsible_user_id } = req.body;

      const taskData = {
        entity_id: parseInt(id),
        entity_type: 'leads',
        text: text || 'Task for lead',
        complete_till: complete_till || Math.floor(Date.now() / 1000) + 86400,
        responsible_user_id: responsible_user_id || undefined
      };

      const taskId = await amoCrmService.createTask(taskData);
      return res.json(successResponse({ taskId }, 'Task created successfully'));
    } catch (error: any) {
      console.error('Error creating task:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to create task'));
    }
  }
);

export default router;


