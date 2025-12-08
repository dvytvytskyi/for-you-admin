import express from 'express';
import { AppDataSource } from '../config/database';
import { AmoCrmLead } from '../entities/AmoCrmLead';
import { AmoCrmStage, LeadStatus } from '../entities/AmoCrmStage';
import { User, UserRole } from '../entities/User';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

/**
 * Мапінг статусу AMO CRM на наші статуси
 */
async function mapStatus(statusId?: number): Promise<'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST' | null> {
  if (!statusId) return null;

  const stageRepo = AppDataSource.getRepository(AmoCrmStage);
  const stage = await stageRepo.findOne({
    where: { amoStageId: statusId },
  });

  if (!stage || !stage.mappedStatus) return null;

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
}

/**
 * GET /api/v1/analytics/my-stats
 * Отримати статистику для поточного користувача (брокера)
 * 
 * Повертає статистику по leads користувача:
 * - Загальна кількість leads
 * - Кількість по статусах (NEW, IN_PROGRESS, QUALIFIED, CLOSED_WON, CLOSED_LOST)
 * - Загальна сума (price) по статусах
 * - Статистика за період
 */
router.get(
  '/my-stats',
  authenticateJWT,
  async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      const userId = user.id || user.userId;
      if (!userId) {
        return res.status(401).json(errorResponse('User ID not found'));
      }

      // Отримуємо користувача з БД для перевірки ролі
      const userRepo = AppDataSource.getRepository(User);
      const dbUser = await userRepo.findOne({
        where: { id: userId },
      });

      if (!dbUser) {
        return res.status(404).json(errorResponse('User not found'));
      }

      const leadRepo = AppDataSource.getRepository(AmoCrmLead);
      
      // TODO: Фільтр по брокеру потребує мапінгу між User.id та AmoCrmUser.amoUserId
      // Поки що показуємо всі leads для всіх користувачів
      // Якщо користувач - брокер, потрібно фільтрувати по responsibleUserId
      const queryBuilder = leadRepo.createQueryBuilder('lead');

      // Якщо користувач - брокер, фільтруємо по його AMO user ID
      // Поки що показуємо всі leads
      // if (dbUser.role === UserRole.BROKER) {
      //   // Потрібен мапінг User.id → AmoCrmUser.amoUserId → responsibleUserId
      // }

      // Отримуємо всі leads
      const allLeads = await queryBuilder.getMany();

      // Мапимо статуси та підраховуємо статистику
      const stats = {
        total: 0,
        byStatus: {
          NEW: { count: 0, totalPrice: 0 },
          IN_PROGRESS: { count: 0, totalPrice: 0 },
          QUALIFIED: { count: 0, totalPrice: 0 },
          CLOSED_WON: { count: 0, totalPrice: 0 },
          CLOSED_LOST: { count: 0, totalPrice: 0 },
        },
        totalPrice: 0,
      };

      // Підраховуємо статистику
      for (const lead of allLeads) {
        const mappedStatus = await mapStatus(lead.statusId);
        const status = mappedStatus || 'NEW';
        const price = lead.price ? Number(lead.price) : 0;

        stats.total++;
        stats.totalPrice += price;

        if (stats.byStatus[status as keyof typeof stats.byStatus]) {
          stats.byStatus[status as keyof typeof stats.byStatus].count++;
          stats.byStatus[status as keyof typeof stats.byStatus].totalPrice += price;
        }
      }

      // Форматуємо відповідь
      const response = {
        total: stats.total,
        totalPrice: stats.totalPrice,
        byStatus: {
          NEW: stats.byStatus.NEW.count,
          IN_PROGRESS: stats.byStatus.IN_PROGRESS.count,
          QUALIFIED: stats.byStatus.QUALIFIED.count,
          CLOSED_WON: stats.byStatus.CLOSED_WON.count,
          CLOSED_LOST: stats.byStatus.CLOSED_LOST.count,
        },
        totalPriceByStatus: {
          NEW: stats.byStatus.NEW.totalPrice,
          IN_PROGRESS: stats.byStatus.IN_PROGRESS.totalPrice,
          QUALIFIED: stats.byStatus.QUALIFIED.totalPrice,
          CLOSED_WON: stats.byStatus.CLOSED_WON.totalPrice,
          CLOSED_LOST: stats.byStatus.CLOSED_LOST.totalPrice,
        },
      };

      return res.json(response);
    } catch (error: any) {
      console.error('Error fetching analytics stats:', error);
      return res.status(500).json(errorResponse(error.message || 'Failed to fetch analytics stats'));
    }
  },
);

export default router;

