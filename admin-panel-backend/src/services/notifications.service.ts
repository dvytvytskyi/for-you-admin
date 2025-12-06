import { AppDataSource } from '../config/database';
import { UserDevice } from '../entities/UserDevice';
import { NotificationSettings } from '../entities/NotificationSettings';
import { NotificationHistory, NotificationType } from '../entities/NotificationHistory';
import { ExpoPushService } from './expo-push.service';
import { In } from 'typeorm';

export interface SendNotificationOptions {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export class NotificationsService {
  private expoPushService: ExpoPushService;

  constructor() {
    this.expoPushService = new ExpoPushService();
  }

  /**
   * Перевірити чи токен є Expo Push Token
   */
  private isExpoPushToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  }

  /**
   * Перевірити чи тип сповіщення увімкнено для користувача
   */
  private isNotificationTypeEnabled(settings: NotificationSettings, type: NotificationType): boolean {
    switch (type) {
      case NotificationType.LEAD_CREATED:
        return settings.leadCreated;
      case NotificationType.LEAD_ASSIGNED:
        return settings.leadAssigned;
      case NotificationType.LEAD_STATUS_CHANGED:
        return settings.leadStatusChanged;
      case NotificationType.NEW_PROPERTY:
        return settings.newProperty;
      case NotificationType.PRICE_CHANGED:
        return settings.priceChanged;
      case NotificationType.NEW_EXCLUSIVE_PROPERTY:
        return settings.newExclusiveProperty;
      case NotificationType.SYSTEM:
        return settings.system;
      case NotificationType.MARKETING:
        return settings.marketing;
      default:
        return true;
    }
  }

  /**
   * Конвертувати дані в рядки (для Expo Push API)
   */
  private convertDataToStrings(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }

  /**
   * Відправити push-сповіщення користувачам
   */
  async sendNotification(options: SendNotificationOptions): Promise<void> {
    const { userIds, type, title, body, data, imageUrl } = options;

    // Отримуємо всіх користувачів з активними налаштуваннями push
    const settings = await AppDataSource.getRepository(NotificationSettings).find({
      where: { userId: In(userIds), pushEnabled: true },
    });

    const enabledUserIds = settings
      .filter((s) => this.isNotificationTypeEnabled(s, type))
      .map((s) => s.userId);

    if (enabledUserIds.length === 0) {
      console.log('Немає користувачів з увімкненими сповіщеннями для цього типу');
      return;
    }

    // Отримуємо активні пристрої користувачів
    const devices = await AppDataSource.getRepository(UserDevice).find({
      where: { userId: In(enabledUserIds), isActive: true },
      order: { lastUsedAt: 'DESC' },
    });

    if (devices.length === 0) {
      console.log('Немає активних пристроїв для відправки');
      return;
    }

    // Створюємо історію сповіщень для всіх користувачів
    const historyEntries = enabledUserIds.map((userId) =>
      AppDataSource.getRepository(NotificationHistory).create({
        userId,
        type,
        title,
        body,
        data,
        imageUrl,
      }),
    );

    await AppDataSource.getRepository(NotificationHistory).save(historyEntries);

    // Відправляємо push через відповідний сервіс
    const tokens = devices.map((d) => d.fcmToken);

    // Розділяємо токени на Expo Push Token та FCM token
    const expoTokens: string[] = [];
    const fcmTokens: string[] = [];

    tokens.forEach((token) => {
      if (this.isExpoPushToken(token)) {
        expoTokens.push(token);
      } else {
        fcmTokens.push(token);
      }
    });

    let totalSuccess = 0;
    let totalFailure = 0;
    const invalidTokens: string[] = [];

    // Відправляємо через Expo Push API
    if (expoTokens.length > 0) {
      try {
        const expoResult = await this.expoPushService.sendMulticastNotification(
          expoTokens,
          title,
          body,
          data ? this.convertDataToStrings(data) : undefined,
        );
        totalSuccess += expoResult.successCount;
        totalFailure += expoResult.failureCount;
        invalidTokens.push(...expoResult.invalidTokens);
      } catch (error: any) {
        console.error(`❌ Failed to send Expo Push notifications: ${error.message}`);
        totalFailure += expoTokens.length;
      }
    }

    // TODO: Додати підтримку Firebase FCM для fcmTokens
    // Якщо у вас є FirebaseService, розкоментуйте цей блок:
    /*
    if (fcmTokens.length > 0) {
      try {
        const firebaseResult = await this.firebaseService.sendMulticastNotification({
          tokens: fcmTokens,
          title,
          body,
          data: data ? this.convertDataToStrings(data) : undefined,
          imageUrl,
        });
        totalSuccess += firebaseResult.successCount;
        totalFailure += firebaseResult.failureCount;
        invalidTokens.push(...firebaseResult.invalidTokens);
      } catch (error: any) {
        console.error(`❌ Failed to send Firebase notifications: ${error.message}`);
        totalFailure += fcmTokens.length;
      }
    }
    */

    // Позначаємо успішно відправлені сповіщення
    if (totalSuccess > 0) {
      await AppDataSource.getRepository(NotificationHistory).update(
        { userId: In(enabledUserIds), type, isSent: false },
        { isSent: true, sentAt: new Date() },
      );
    }

    // Деактивуємо невалідні токени
    if (invalidTokens.length > 0) {
      await AppDataSource.getRepository(UserDevice).update(
        { fcmToken: In(invalidTokens) },
        { isActive: false },
      );
    }

    console.log(
      `✅ Відправлено ${totalSuccess} сповіщень, ${totalFailure} помилок, ${invalidTokens.length} невалідних токенів`,
    );
  }
}

