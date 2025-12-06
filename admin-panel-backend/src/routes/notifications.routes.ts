import express from 'express';
import { authenticateJWT, requireAdmin, AuthRequest } from '../middleware/auth';
import { NotificationsService } from '../services/notifications.service';
import { NotificationType } from '../entities/NotificationHistory';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();
const notificationsService = new NotificationsService();

interface SendNotificationDto {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

/**
 * POST /api/notifications/send
 * Відправити push-сповіщення користувачам (тільки ADMIN)
 */
router.post('/send', authenticateJWT, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userIds, type, title, body, data, imageUrl }: SendNotificationDto = req.body;

    // Валідація
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json(errorResponse('userIds is required and must be a non-empty array'));
    }

    if (!type || !Object.values(NotificationType).includes(type)) {
      return res.status(400).json(errorResponse(`type must be one of: ${Object.values(NotificationType).join(', ')}`));
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json(errorResponse('title is required and must be a non-empty string'));
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json(errorResponse('body is required and must be a non-empty string'));
    }

    // Відправляємо сповіщення
    await notificationsService.sendNotification({
      userIds,
      type,
      title: title.trim(),
      body: body.trim(),
      data,
      imageUrl,
    });

    res.json(successResponse(
      { sentTo: userIds.length },
      'Сповіщення успішно відправлено'
    ));
  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json(errorResponse('Failed to send notification', error.message));
  }
});

export default router;

