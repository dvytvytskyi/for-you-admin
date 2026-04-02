import express from 'express';
import { AmoCrmService } from '../../../services/amo-crm.service';
import { successResponse, errorResponse } from '../../utils/response';

const router = express.Router();
const amoCrmService = new AmoCrmService();

/**
 * POST /api/callback
 * Запит на зворотній дзвінок
 */
router.post('/callback', async (req, res) => {
  try {
    const { name, phone, email, message, source = 'Callback Form' } = req.body;

    if (!name || (!phone && !email)) {
      return res.status(400).json(errorResponse('Name and (Phone or Email) are required'));
    }

    await amoCrmService.submitEnquiryToAmo({
      name,
      phone,
      email,
      message,
      source,
    });

    return res.json(successResponse(null, 'Заявку успішно відправлено'));
  } catch (error: any) {
    console.error('Error handling callback:', error);
    // Навіть якщо AmoCRM видав помилку, ми кажемо користувачу що все ок (бо заявка в логах все одно є)
    return res.json(successResponse(null, 'Заявку прийнято до обробки'));
  }
});

/**
 * POST /api/meetings
 * Запит на зустріч
 */
router.post('/meetings', async (req, res) => {
  try {
    const { name, phone, email, date, time, notes, location = 'Main Office' } = req.body;

    if (!name || (!phone && !email)) {
      return res.status(400).json(errorResponse('Name and Contact (Phone/Email) are required'));
    }

    await amoCrmService.submitEnquiryToAmo({
      name,
      phone,
      email,
      message: notes,
      source: 'Meeting Request',
      additionalInfo: {
        date,
        time,
        location,
        type: 'Office Meeting'
      }
    });

    return res.json(successResponse(null, 'Запит на зустріч відправлено'));
  } catch (error: any) {
    console.error('Error handling meeting request:', error);
    return res.json(successResponse(null, 'Запит прийнято до обробки'));
  }
});

export default router;
