import express from 'express';
import { AmoCrmService } from '../services/amo-crm.service';
import { authenticateJWT, requireAdmin, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();
const amoCrmService = new AmoCrmService();

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
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, from_exchange, state } = req.query;

    if (!code) {
      return res.status(400).json(errorResponse('Authorization code is missing'));
    }

    const tokens = await amoCrmService.exchangeCode(code as string);

    // Перенаправити на успішну сторінку або показати повідомлення
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AMO CRM Connected</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
            }
            h1 { color: #4CAF50; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ AMO CRM успішно підключено!</h1>
            <p>Ви можете закрити це вікно.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AMO CRM Connection Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
            }
            h1 { color: #f5576c; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Помилка підключення</h1>
            <p>${error.message || 'Failed to exchange authorization code'}</p>
          </div>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/amo-crm/status
 * Перевірити статус підключення
 */
router.get(
  '/status',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const status = await amoCrmService.getConnectionStatus();
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
 * POST /api/amo-crm/sync/leads
 * Синхронізація leads
 */
router.post(
  '/sync/leads',
  authenticateJWT,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const result = await amoCrmService.syncLeads(limit);
      return res.json(successResponse(result, 'Leads синхронізовано'));
    } catch (error: any) {
      console.error('Error syncing leads:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to sync leads'));
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
 * POST /api/amo-crm/set-tokens
 * Встановити токени напряму (для тестування або якщо Main Backend не готовий)
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

export default router;

