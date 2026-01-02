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
      const queryBuilder = leadRepo.createQueryBuilder('lead');

      // 1. Фільтрація по брокеру
      if (dbUser.role === UserRole.BROKER) {
        // Завантажуємо зв'язок з AmoCrmUser, якщо він ще не завантажений
        if (!dbUser.amoCrmUser) {
          const userWithAmo = await userRepo.findOne({
            where: { id: userId },
            relations: ['amoCrmUser'],
          });
          if (userWithAmo) {
            dbUser.amoCrmUser = userWithAmo.amoCrmUser;
          }
        }

        if (dbUser.amoCrmUser?.amoUserId) {
          queryBuilder.andWhere('lead.responsible_user_id = :amoUserId', {
            amoUserId: dbUser.amoCrmUser.amoUserId
          });
        } else {
          // Якщо брокер не прив'язаний до AmoCRM, повертаємо нулі
          return res.json({
            newLeads: 0,
            activeDeals: 0,
            totalAmount: 0,
            // Залишаємо детальні дані для сумісності/дебагу
            total: 0,
            totalPrice: 0,
            byStatus: { NEW: 0, IN_PROGRESS: 0, QUALIFIED: 0, CLOSED_WON: 0, CLOSED_LOST: 0 },
            totalPriceByStatus: { NEW: 0, IN_PROGRESS: 0, QUALIFIED: 0, CLOSED_WON: 0, CLOSED_LOST: 0 },
          });
        }
      }

      // Отримуємо всі leads (вже відфільтровані)
      const allLeads = await queryBuilder.getMany();

      // Попередньо завантажуємо всі стадії для мапінгу (оптимізація)
      const stageRepo = AppDataSource.getRepository(AmoCrmStage);
      const allStages = await stageRepo.find();
      const stagesMap = new Map<number, AmoCrmStage>();
      allStages.forEach(s => stagesMap.set(s.amoStageId, s));

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

      // Функція синхронного мапінгу (копія з leads.routes.ts для ізоляції)
      const mapStatusSync = (statusId: number | undefined): 'NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST' | null => {
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
      };

      // Підраховуємо статистику
      for (const lead of allLeads) {
        const mappedStatus = mapStatusSync(lead.statusId);
        const status = mappedStatus || 'NEW';
        const price = lead.price ? Number(lead.price) : 0;

        stats.total++;
        stats.totalPrice += price;

        if (stats.byStatus[status as keyof typeof stats.byStatus]) {
          stats.byStatus[status as keyof typeof stats.byStatus].count++;
          stats.byStatus[status as keyof typeof stats.byStatus].totalPrice += price;
        }
      }

      // Розрахунок полів для мобільного дешборду
      // newLeads = NEW
      // activeDeals = IN_PROGRESS + QUALIFIED (або всі не закриті)
      // totalAmount = сума всіх активних (або всіх взагалі - залежить від вимог. Зазвичай Total Amount це Pipeline Volume)

      const newLeads = stats.byStatus.NEW.count;
      const activeDeals = stats.byStatus.NEW.count + stats.byStatus.IN_PROGRESS.count + stats.byStatus.QUALIFIED.count;
      // Total Amount зазвичай включає всі відкриті угоди
      const totalAmount = stats.byStatus.NEW.totalPrice + stats.byStatus.IN_PROGRESS.totalPrice + stats.byStatus.QUALIFIED.totalPrice;

      // Форматуємо відповідь
      const response = {
        // Основні поля для мобільного дешборду
        newLeads,
        activeDeals,
        totalAmount,

        // Деталі (залишаємо про всяк випадок)
        total: stats.total,
        totalPrice: stats.totalPrice, // Це сума ВСІХ, включаючи закриті
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

