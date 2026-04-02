import express from 'express';
import { Not, IsNull } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { AmoCrmToken } from '../../entities/AmoCrmToken';
import { AmoCrmUser } from '../../entities/AmoCrmUser';
import { AmoCrmService } from '../../../services/amo-crm.service';
import { authenticateJWT, requireAdmin, requireBrokerOrAdmin, AuthRequest } from '../../middleware/auth';
import { successResponse, errorResponse } from '../../utils/response';

const router = express.Router();
const amoCrmService = new AmoCrmService();

/**
 * GET /api/amo-crm/users
 * Отримати список користувачів AMO CRM (співробітників)
 */
router.get(
  '/users',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const amoCrmUserRepo = AppDataSource.getRepository(AmoCrmUser);
      const users = await amoCrmUserRepo.find({
        order: { name: 'ASC' },
      });

      return res.json(successResponse(users));
    } catch (error: any) {
      console.error('Error fetching AMO CRM users:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch AMO CRM users'));
    }
  },
);

/**
 * POST /api/amo-crm/exchange-api-key
 * Обмін API ключа на authorization code
 */
router.post(
  '/exchange-api-key',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { login, api_key, state } = req.body;

      if (!login || !api_key) {
        return res.status(400).json(errorResponse('login та api_key є обов\'язковими'));
      }

      await amoCrmService.exchangeApiKeyForCode(login, api_key, state);

      return res.status(202).json(successResponse(
        { fromExchange: true },
        'API key exchange request accepted. Authorization code will be sent to redirect URI'
      ));
    } catch (error: any) {
      console.error('Error exchanging API key:', error);
      return res.status(400).json(errorResponse(error.message || 'Failed to exchange API key'));
    }
  },
);

/**
 * GET /api/amo-crm/callback
 * OAuth callback endpoint
 * Обмінює code на токени ПЕРЕД показом HTML
 * Показує кнопку "Return to App" без автоматичного redirect
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      const deepLink = 'foryoure://amo-crm/callback?error=missing_code';
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>AMO CRM Authorization</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 20px;
                max-width: 400px;
              }
              .error {
                color: #f44336;
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 16px;
              }
              button {
                color: #007AFF;
                font-weight: 500;
                padding: 14px 28px;
                background: white;
                border: none;
                border-radius: 8px;
                display: inline-block;
                margin-top: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                cursor: pointer;
                font-size: 16px;
                min-width: 200px;
              }
              button:active {
                opacity: 0.8;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <p class="error">✗ Authorization code is missing</p>
              <p>Please tap the button below to return to the app:</p>
              <button onclick="window.open('${deepLink}', '_self')">Return to App</button>
            </div>
          </body>
        </html>
      `);
    }

    // ⚠️ ВАЖЛИВО: Обміняти code на токени ПЕРЕД показом HTML
    // Це гарантує, що CRM буде вже верифікована, коли користувач повернеться в додаток
    try {
      await amoCrmService.exchangeCode(code as string);
    } catch (error: any) {
      console.error('Error exchanging code:', error);
      const errorMsg = encodeURIComponent(error.message || 'auth_failed');
      const deepLink = `foryoure://amo-crm/callback?error=${errorMsg}`;

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>AMO CRM Authorization Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 20px;
                max-width: 400px;
              }
              .error {
                color: #f44336;
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 16px;
              }
              button {
                color: #007AFF;
                font-weight: 500;
                padding: 14px 28px;
                background: white;
                border: none;
                border-radius: 8px;
                display: inline-block;
                margin-top: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                cursor: pointer;
                font-size: 16px;
                min-width: 200px;
              }
              button:active {
                opacity: 0.8;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <p class="error">✗ Authorization failed</p>
              <p>${error.message || 'Failed to connect to AMO CRM'}</p>
              <p>Please tap the button below to return to the app:</p>
              <button onclick="window.open('${deepLink}', '_self')">Return to App</button>
            </div>
          </body>
        </html>
      `);
    }

    // ✅ CRM вже верифікована! Токени збережені в БД
    // Тепер показуємо сторінку з кнопкою для повернення в додаток
    // ⚠️ ВАЖЛИВО: Не передаємо code, бо токени вже збережені в БД
    // Backend вже обміняв code на токени ПЕРЕД показом HTML
    const stateParam = state ? `&state=${encodeURIComponent(state as string)}` : '';
    const deepLink = `foryoure://amo-crm/callback?success=true${stateParam}`;

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>AMO CRM Authorization</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 20px;
              max-width: 400px;
            }
            .success {
              color: #4CAF50;
              font-size: 18px;
              font-weight: 500;
              margin-bottom: 16px;
            }
            .message {
              color: #666;
              font-size: 16px;
              margin-bottom: 24px;
              line-height: 1.5;
            }
            button {
              color: #007AFF;
              font-weight: 500;
              padding: 14px 28px;
              background: white;
              border: none;
              border-radius: 8px;
              display: inline-block;
              margin-top: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              cursor: pointer;
              font-size: 16px;
              min-width: 200px;
            }
            button:active {
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <p class="success">✓ Authorization successful!</p>
            <p class="message">Your AMO CRM account has been successfully connected.</p>
            <p class="message">Please tap the button below to return to the app:</p>
            <button onclick="window.open('${deepLink}', '_self')">Return to App</button>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Callback error:', error);
    const errorMsg = encodeURIComponent(error.message || 'auth_failed');
    const deepLink = `foryoure://amo-crm/callback?error=${errorMsg}`;

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>AMO CRM Authorization Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 20px;
              max-width: 400px;
            }
            .error {
              color: #f44336;
              font-size: 18px;
              font-weight: 500;
              margin-bottom: 16px;
            }
            button {
              color: #007AFF;
              font-weight: 500;
              padding: 14px 28px;
              background: white;
              border: none;
              border-radius: 8px;
              display: inline-block;
              margin-top: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              cursor: pointer;
              font-size: 16px;
              min-width: 200px;
            }
            button:active {
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <p class="error">✗ Authorization failed</p>
            <p>Please tap the button below to return to the app:</p>
            <button onclick="window.open('${deepLink}', '_self')">Return to App</button>
          </div>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/amo-crm/status
 * Перевірити статус підключення (для поточного користувача)
 * Спочатку шукає токени для користувача, якщо немає - перевіряє глобальні (fallback)
 */
router.get(
  '/status',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      const amoCrmTokenRepository = AppDataSource.getRepository(AmoCrmToken);

      // Спочатку шукаємо токени для користувача
      let token = await amoCrmTokenRepository.findOne({
        where: { userId: userId },
        order: { createdAt: 'DESC' },
      });

      // Якщо немає для користувача - перевіряємо глобальні (userId IS NULL)
      if (!token) {
        token = await amoCrmTokenRepository.findOne({
          where: { userId: IsNull() },
          order: { createdAt: 'DESC' },
        });
      }

      // Перевіряємо, чи токен валідний (не прострочений)
      const hasValidToken = token && token.expiresAt > new Date();

      const status = {
        connected: hasValidToken,
        hasTokens: !!token,
        domain: process.env.AMO_DOMAIN || '',
        accountId: process.env.AMO_ACCOUNT_ID || '',
      };

      return res.json(successResponse(status));
    } catch (error: any) {
      console.error('Error getting connection status:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to get connection status'));
    }
  },
);

/**
 * POST /api/amo-crm/sync/pipelines
 * Синхронізація pipelines та stages
 */
router.post(
  '/sync/pipelines',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const result = await amoCrmService.syncPipelines();
      return res.json(successResponse(result, 'Pipelines синхронізовано'));
    } catch (error: any) {
      console.error('Error syncing pipelines:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to sync pipelines'));
    }
  },
);

/**
 * GET /api/amo-crm/pipelines
 * Отримати pipelines та stages з AMO CRM (для всіх авторизованих користувачів)
 */
router.get(
  '/pipelines',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      // Отримуємо токени для користувача
      const pipelines = await amoCrmService.getPipelines(userId);

      // Форматуємо відповідь
      const formattedPipelines = pipelines.map((pipeline: any) => ({
        id: pipeline.id,
        name: pipeline.name,
        sort: pipeline.sort,
        isMain: pipeline.is_main,
        stages: pipeline._embedded?.statuses?.map((stage: any) => ({
          id: stage.id,
          pipelineId: pipeline.id,
          name: stage.name,
          sort: stage.sort,
          color: stage.color,
          type: stage.type,
        })) || [],
      }));

      return res.json({
        data: formattedPipelines,
        count: formattedPipelines.length,
      });
    } catch (error: any) {
      console.error('Error getting pipelines:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to get pipelines'));
    }
  },
);

/**
 * POST /api/amo-crm/sync/leads
 * Синхронізація leads (початкова пачка)
 */
router.post(
  '/sync/leads',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || parseInt(req.body.limit as string) || 50;
      const result = await amoCrmService.syncLeads(limit);
      return res.json(successResponse(result, 'Leads синхронізовано'));
    } catch (error: any) {
      console.error('Error syncing leads:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to sync leads'));
    }
  },
);

/**
 * POST /api/amo-crm/sync/leads/full
 * Повна синхронізація всіх leads (посторінково)
 */
router.post(
  '/sync/leads/full',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || parseInt(req.body.limit as string) || 50;
      const result = await amoCrmService.syncAllLeads(limit);
      return res.json(successResponse(result, 'Повна синхронізація лідів завершена'));
    } catch (error: any) {
      console.error('Error in full leads sync:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to sync all leads'));
    }
  },
);

/**
 * POST /api/amo-crm/test/create-leads
 * Створення тестових лідів для брокера
 */
router.post(
  '/test/create-leads',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { amoUserId, count = 10 } = req.body;

      if (!amoUserId) {
        return res.status(400).json(errorResponse('amoUserId is required'));
      }

      console.log(`[TEST] Creating ${count} test leads for amoUserId: ${amoUserId}...`);

      const createdIds = [];
      for (let i = 1; i <= count; i++) {
        const leadId = await amoCrmService.createLead({
          name: `Test Lead for CRM Verification #${i} (${new Date().toLocaleDateString()})`,
          price: Math.floor(Math.random() * 1000000) + 100000,
          responsible_user_id: parseInt(amoUserId),
        });
        createdIds.push(leadId);

        // Також синхронізуємо щойно створений лід локально
        const amoLead = await amoCrmService.getLead(leadId);
        await amoCrmService.saveLeadLocally(amoLead);
      }

      return res.json(successResponse({ createdIds }, `${count} тестових лідів створено та синхронізовано`));
    } catch (error: any) {
      console.error('Error creating test leads:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to create test leads'));
    }
  },
);

/**
 * POST /api/amo-crm/test/enrich-leads
 * Збагачення тестових лідів даними (Contacts, Notes)
 */
router.post(
  '/test/enrich-leads',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { amoUserId, limit = 20 } = req.body;

      if (!amoUserId) {
        return res.status(400).json(errorResponse('amoUserId is required'));
      }

      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmLead } = await import('../../entities/AmoCrmLead');
      const leadRepo = AppDataSource.getRepository(AmoCrmLead);

      const leads = await leadRepo.find({
        where: { responsibleUserId: amoUserId },
        order: { createdAt: 'DESC' },
        take: limit
      });

      console.log(`Processing enrichment for ${leads.length} leads...`);

      for (const [index, lead] of leads.entries()) {
        try {
          // 1. Create Contact
          const contactName = `Guest ${index + 1} (${lead.name.substring(0, 10)}...)`;
          const contactId = await amoCrmService.createContact({ name: contactName });

          // 2. Link
          await amoCrmService.linkContactToLead(lead.amoLeadId, contactId);

          // 3. Note
          const budget = lead.price ? `AED ${Number(lead.price).toLocaleString()}` : 'Undisclosed';
          const preferences = ['Sea View', 'High Floor', 'Near Metro', 'Balcony', 'Gym Access'][Math.floor(Math.random() * 5)];
          const nationality = ['UK', 'France', 'Germany', 'Russia', 'India', 'UAE'][Math.floor(Math.random() * 6)];

          const noteText = `
⭐⭐⭐ CLIENT DETAILS ⭐⭐⭐
Name: ${contactName}
Nationality: ${nationality}
Budget: ${budget}
Preferences: ${preferences}
Phone: +971 50 ${Math.floor(1000000 + Math.random() * 9000000)}
Email: client${index}@example.com

💬 LATEST COMMENT:
Client is very interested in 2BR apartments in Downtown or Marina. Waiting for floor plans.
           `.trim();

          await amoCrmService.addNote(lead.amoLeadId, 'leads', noteText);

          // Delay
          await new Promise(r => setTimeout(r, 200));
        } catch (e: any) {
          console.error(`Failed to enrich lead ${lead.amoLeadId}:`, e.message);
        }
      }

      return res.json(successResponse({ processed: leads.length }, 'Leads enriched successfully'));
    } catch (error: any) {
      console.error('Error enriching leads:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to enrich leads'));
    }
  },
);

/**
 * GET /api/amo-crm/leads
 * Отримати leads з локальної БД
 */
router.get(
  '/leads',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmLead } = await import('../../entities/AmoCrmLead');

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const leadRepo = AppDataSource.getRepository(AmoCrmLead);
      const [leads, total] = await leadRepo.findAndCount({
        order: { updatedAt: 'DESC' },
        skip,
        take: limit,
      });

      return res.json(successResponse({
        data: leads,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }));
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch leads'));
    }
  },
);

/**
 * GET /api/amo-crm/leads/:id
 * Отримати повну інформацію про лід (Live Data from AmoCRM)
 * Returns: { lead, notes, events }
 */
router.get(
  '/leads/:id',
  authenticateJWT,
  requireBrokerOrAdmin,
  async (req: AuthRequest, res) => {
    try {
      console.log(`[AMO CRM API] Fetching details for lead ${req.params.id} by user ${req.user?.id} (${req.user?.role})`);
      const { id } = req.params;
      const amoLeadId = parseInt(id);

      if (isNaN(amoLeadId)) {
        return res.status(400).json(errorResponse('Invalid Lead ID'));
      }

      // Fetch live data from AmoCRM in parallel
      const [lead, notes, events, tasks] = await Promise.all([
        amoCrmService.getLead(amoLeadId).catch(() => null),
        amoCrmService.getLeadNotes(amoLeadId),
        amoCrmService.getLeadEvents(amoLeadId),
        amoCrmService.getLeadTasks(amoLeadId)
      ]);

      if (!lead) {
        return res.status(404).json(errorResponse('Lead not found in AmoCRM'));
      }

      // Fetch contacts details
      const contactIds = lead._embedded?.contacts?.map((c: any) => c.id) || [];
      const contacts = await Promise.all(
        contactIds.map(id => amoCrmService.getContact(id).catch(() => null))
      );

      return res.json(successResponse({
        lead,     // AmoCRM Lead Object
        contacts, // Array of Contact Objects
        notes,    // Comments/Notes array
        events,   // Activity/History array
        tasks     // Tasks array
      }));

    } catch (error: any) {
      console.error('Error fetching lead details:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch lead details'));
    }
  },
);

/**
 * POST /api/amo-crm/leads/:id/notes
 * Додати коментар до ліда
 */
router.post(
  '/leads/:id/notes',
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
      return res.json(successResponse(null, 'Comment added successfully'));
    } catch (error: any) {
      console.error('Error adding note:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to add comment'));
    }
  },
);

/**
 * POST /api/amo-crm/leads/:id/tasks
 * Створити завдання для ліда
 */
router.post(
  '/leads/:id/tasks',
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
        complete_till: complete_till || Math.floor(Date.now() / 1000) + 86400, // +1 day by default
        responsible_user_id: responsible_user_id || undefined
      };

      const taskId = await amoCrmService.createTask(taskData);
      return res.json(successResponse({ taskId }, 'Task created successfully'));
    } catch (error: any) {
      console.error('Error creating task:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to create task'));
    }
  },
);

/**
 * POST /api/amo-crm/create-lead
 * Створити lead в AMO CRM (викликається з Main Backend)
 */
router.post(
  '/create-lead',
  async (req, res) => {
    try {
      // Перевірка API ключа
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.MAIN_BACKEND_API_KEY) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { leadData } = req.body;
      const leadId = await amoCrmService.createLead(leadData);

      return res.json(successResponse({
        amoLeadId: leadId,
      }));
    } catch (error: any) {
      console.error('Error creating lead in AMO CRM:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to create lead in AMO CRM'));
    }
  },
);

/**
 * POST /api/amo-crm/update-lead
 * Оновити lead в AMO CRM (викликається з Main Backend)
 */
router.post(
  '/update-lead',
  async (req, res) => {
    try {
      // Перевірка API ключа
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.MAIN_BACKEND_API_KEY) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const { leadId, leadData } = req.body;
      await amoCrmService.updateLead(leadId, leadData);

      return res.json(successResponse(null, 'Lead updated in AMO CRM'));
    } catch (error: any) {
      console.error('Error updating lead in AMO CRM:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to update lead in AMO CRM'));
    }
  },
);

/**
 * POST /api/amo-crm/exchange-code
 * Обмін authorization code на токени для поточного користувача
 */
router.post(
  '/exchange-code',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json(errorResponse('Authorization code is required'));
      }

      await amoCrmService.exchangeCodeForUser(userId, code);
      return res.json(successResponse(null, 'AMO CRM successfully connected'));
    } catch (error: any) {
      console.error('Error exchanging code:', error);
      return res.status(400).json(errorResponse(error.message || 'Failed to exchange authorization code'));
    }
  },
);

/**
 * POST /api/amo-crm/disconnect
 * Відключити AMO CRM для поточного користувача
 */
router.post(
  '/disconnect',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      await amoCrmService.disconnectUser(userId);
      return res.json(successResponse(null, 'AMO CRM disconnected'));
    } catch (error: any) {
      console.error('Error disconnecting AMO CRM:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to disconnect AMO CRM'));
    }
  },
);

/**
 * POST /api/amo-crm/set-tokens
 * Встановити токени напряму (для тестування або якщо Main Backend не готовий)
 * Тільки для адмінів (глобальні токени)
 */
router.post(
  '/set-tokens',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { access_token, refresh_token, expires_in, token_type } = req.body;

      if (!access_token) {
        return res.status(400).json(errorResponse('access_token є обов\'язковим'));
      }

      const amoCrmService = new AmoCrmService();
      await amoCrmService.saveTokensLocally({
        access_token,
        refresh_token: refresh_token || undefined,
        expires_in: expires_in || 1200, // 20 хвилин за замовчуванням
        token_type: token_type || 'Bearer',
      });

      return res.json(successResponse(null, 'Токени успішно збережено'));
    } catch (error: any) {
      console.error('Error setting tokens:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to set tokens'));
    }
  },
);

/**
 * POST /api/amo-crm/webhook
 * Webhook endpoint для прийому подій з AMO CRM
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const result = await amoCrmService.processWebhook(payload);

    // Завжди повертаємо 200 OK для AMO CRM
    return res.json(successResponse({
      processed: result.processed,
      errors: result.errors,
    }, 'Webhook processed'));
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // Все одно повертаємо 200 OK, щоб AMO CRM не повторював запит
    return res.json(successResponse({
      processed: 0,
      errors: 1,
    }, 'Webhook processed with errors'));
  }
});

/**
 * POST /api/amo-crm/sync/contacts
 * Синхронізація contacts
 */
router.post(
  '/sync/contacts',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || parseInt(req.body.limit as string) || 50;
      const result = await amoCrmService.syncContacts(limit);
      return res.json(successResponse(result, 'Contacts синхронізовано'));
    } catch (error: any) {
      console.error('Error syncing contacts:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to sync contacts'));
    }
  },
);

/**
 * GET /api/amo-crm/contacts
 * Отримати contacts з локальної БД
 */
router.get(
  '/contacts',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmContact } = await import('../../entities/AmoCrmContact');

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const contactRepo = AppDataSource.getRepository(AmoCrmContact);
      const [contacts, total] = await contactRepo.findAndCount({
        order: { updatedAt: 'DESC' },
        skip,
        take: limit,
      });

      return res.json(successResponse({
        data: contacts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }));
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch contacts'));
    }
  },
);

/**
 * POST /api/amo-crm/sync/users
 * Синхронізація users
 */
router.post(
  '/sync/users',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const result = await amoCrmService.syncUsers();
      return res.json(successResponse(result, 'Users синхронізовано'));
    } catch (error: any) {
      console.error('Error syncing users:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to sync users'));
    }
  },
);

/**
 * GET /api/amo-crm/users
 * Отримати users з локальної БД
 */
router.get(
  '/users',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmUser } = await import('../../entities/AmoCrmUser');

      const userRepo = AppDataSource.getRepository(AmoCrmUser);
      const users = await userRepo.find({
        order: { name: 'ASC' },
      });

      return res.json(successResponse(users));
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch users'));
    }
  },
);

/**
 * GET /api/amo-crm/users/unlinked
 * Отримати список AmoCRM користувачів, які ще не прив'язані до користувачів системи
 */
router.get(
  '/users/unlinked',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmUser } = await import('../../entities/AmoCrmUser');

      const userRepo = AppDataSource.getRepository(AmoCrmUser);

      // Знаходимо користувачів, які не мають зв'язку з таблицею users
      const unlinkedUsers = await userRepo
        .createQueryBuilder('amoUser')
        .leftJoinAndSelect('amoUser.user', 'user')
        .where('user.id IS NULL')
        .andWhere('amoUser.isActive = :isActive', { isActive: true }) // Тільки активні
        .orderBy('amoUser.name', 'ASC')
        .getMany();

      return res.json(successResponse(unlinkedUsers));
    } catch (error: any) {
      console.error('Error fetching unlinked users:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch unlinked users'));
    }
  },
);

/**
 * POST /api/amo-crm/sync/tasks
 * Синхронізація tasks
 */
router.post(
  '/sync/tasks',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || parseInt(req.body.limit as string) || 50;
      const result = await amoCrmService.syncTasks(limit);
      return res.json(successResponse(result, 'Tasks синхронізовано'));
    } catch (error: any) {
      console.error('Error syncing tasks:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to sync tasks'));
    }
  },
);

/**
 * GET /api/amo-crm/tasks
 * Отримати tasks з локальної БД
 */
router.get(
  '/tasks',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmTask } = await import('../../entities/AmoCrmTask');

      const { entityType, entityId, isCompleted } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const taskRepo = AppDataSource.getRepository(AmoCrmTask);
      const queryBuilder = taskRepo.createQueryBuilder('task');

      if (entityType) {
        queryBuilder.andWhere('task.entityType = :entityType', { entityType });
      }
      if (entityId) {
        queryBuilder.andWhere('task.entityId = :entityId', { entityId: parseInt(entityId as string) });
      }
      if (isCompleted !== undefined) {
        queryBuilder.andWhere('task.isCompleted = :isCompleted', { isCompleted: isCompleted === 'true' });
      }

      const [tasks, total] = await queryBuilder
        .orderBy('task.createdAt', 'DESC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return res.json(successResponse({
        data: tasks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }));
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch tasks'));
    }
  },
);

/**
 * POST /api/amo-crm/sync-all
 * Повна синхронізація всіх даних з AMO CRM
 */
router.post(
  '/sync-all',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { pipelines, leads, contacts, users, tasks } = req.body;
      const results: any = {};

      if (pipelines !== false) {
        results.pipelines = await amoCrmService.syncPipelines();
      }
      if (leads !== false) {
        const limit = parseInt(req.body.leadsLimit as string) || 50;
        results.leads = await amoCrmService.syncLeads(limit);
      }
      if (contacts !== false) {
        const limit = parseInt(req.body.contactsLimit as string) || 50;
        results.contacts = await amoCrmService.syncContacts(limit);
      }
      if (users !== false) {
        results.users = await amoCrmService.syncUsers();
      }
      if (tasks !== false) {
        const limit = parseInt(req.body.tasksLimit as string) || 50;
        results.tasks = await amoCrmService.syncTasks(limit);
      }

      return res.json(successResponse(results, 'Синхронізація завершена'));
    } catch (error: any) {
      console.error('Error in sync-all:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to sync all data'));
    }
  },
);

/**
 * GET /api/amo-crm/pipelines/:id/stages
 * Отримати stages конкретної воронки (для всіх авторизованих користувачів)
 */
router.get(
  '/pipelines/:id/stages',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      const { id } = req.params;
      const pipelineId = parseInt(id);

      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmStage } = await import('../../entities/AmoCrmStage');

      const stageRepo = AppDataSource.getRepository(AmoCrmStage);

      const stages = await stageRepo.find({
        where: { amoPipelineId: pipelineId },
        order: { sort: 'ASC' },
        relations: ['pipeline'],
      });

      const formattedStages = stages.map(stage => ({
        id: stage.amoStageId,
        pipelineId: stage.amoPipelineId,
        name: stage.name,
        sort: stage.sort,
        color: stage.color || undefined,
        mappedStatus: stage.mappedStatus || undefined,
        statusType: stage.statusType,
      }));

      return res.json({
        data: formattedStages,
        count: formattedStages.length,
      });
    } catch (error: any) {
      console.error('Error fetching pipeline stages:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch pipeline stages'));
    }
  },
);

/**
 * GET /api/amo-crm/stages
 * Отримати stages з мапінгом статусів (для всіх авторизованих користувачів)
 */
router.get(
  '/stages',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmStage } = await import('../../entities/AmoCrmStage');

      const { pipelineId } = req.query;
      const stageRepo = AppDataSource.getRepository(AmoCrmStage);

      const queryBuilder = stageRepo.createQueryBuilder('stage');
      if (pipelineId) {
        queryBuilder.andWhere('stage.amoPipelineId = :pipelineId', { pipelineId: parseInt(pipelineId as string) });
      }

      const stages = await queryBuilder
        .orderBy('stage.sort', 'ASC')
        .getMany();

      const formattedStages = stages.map(stage => ({
        id: stage.amoStageId,
        pipelineId: stage.amoPipelineId,
        name: stage.name,
        sort: stage.sort,
        color: stage.color || undefined,
        mappedStatus: stage.mappedStatus || undefined,
        statusType: stage.statusType,
      }));

      return res.json({
        data: formattedStages,
        count: formattedStages.length,
      });
    } catch (error: any) {
      console.error('Error fetching stages:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch stages'));
    }
  },
);

/**
 * GET /api/amo-crm/stages/mapping
 * Отримати мапінг статусів (AMO stages → наші статуси)
 */
router.get(
  '/stages/mapping',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { AppDataSource } = await import('../../config/database');
      const { AmoCrmStage, LeadStatus } = await import('../../entities/AmoCrmStage');

      const stageRepo = AppDataSource.getRepository(AmoCrmStage);
      const stages = await stageRepo.find({
        where: { mappedStatus: Not(null as any) },
        relations: ['pipeline'],
        order: { sort: 'ASC' },
      });

      const mapping = stages.map(stage => ({
        amoStageId: stage.amoStageId,
        amoStageName: stage.name,
        pipelineId: stage.amoPipelineId,
        pipelineName: stage.pipeline?.name,
        mappedStatus: stage.mappedStatus,
      }));

      return res.json(successResponse(mapping));
    } catch (error: any) {
      console.error('Error fetching status mapping:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch status mapping'));
    }
  },
);

export default router;

