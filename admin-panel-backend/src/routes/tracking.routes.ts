import express from 'express';
import { AmoCrmService } from '../services/amo-crm.service';
import { TelegramService } from '../services/telegram.service';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();
const amoCrmService = new AmoCrmService();
const telegramService = new TelegramService();

// Тимчасовий кеш для запобігання спаму (не відправляти повідомлення для одного юзера частіше ніж раз в 5 хвилин)
const alertCache = new Map<string, number>();

router.post('/visit', async (req, res) => {
  try {
    const { visitorId, url } = req.body;

    if (!visitorId) {
      return res.status(400).json(errorResponse('Visitor ID is required'));
    }

    // Перевірка кешу
    const now = Date.now();
    const lastAlert = alertCache.get(visitorId);
    if (lastAlert && now - lastAlert < 5 * 60 * 1000) {
      return res.json(successResponse({ status: 'ignored', reason: 'throttled' }));
    }

    // Пошук контакту по visitorId (field ID 1439787)
    const contact = await amoCrmService.findContactByTechnicalComment(visitorId);

    if (contact) {
      // Якщо контакт знайдено - відправляємо повідомлення в Telegram
      const amoLink = `https://reforyou.amocrm.ru/contacts/detail/${contact.id}`;
      const message = `🔔 <b>Возврат пользователя на сайт!</b>\n\n` +
                      `👤 <b>Имя:</b> ${contact.name}\n` +
                      `🌍 <b>Страница:</b> ${url || 'Неизвестно'}\n` +
                      `🔗 <a href="${amoLink}">Открыть в AmoCRM</a>`;

      await telegramService.sendMessage(message);
      alertCache.set(visitorId, now);
      
      return res.json(successResponse({ status: 'alerted', contactId: contact.id }));
    }

    return res.json(successResponse({ status: 'unknown' }));
  } catch (error: any) {
    console.error('[TRACKING] Error:', error.message);
    return res.status(500).json(errorResponse(error.message));
  }
});

export default router;
