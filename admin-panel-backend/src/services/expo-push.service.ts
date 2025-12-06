import axios from 'axios';

export interface ExpoPushMessage {
  to: string | string[];
  sound?: 'default';
  title?: string;
  body?: string;
  data?: Record<string, any>;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
}

export interface ExpoPushResponse {
  data: Array<{
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: {
      error?: 'DeviceNotRegistered' | 'InvalidCredentials' | 'MessageTooBig' | 'MessageRateExceeded';
    };
  }>;
}

export class ExpoPushService {
  private readonly expoApiUrl = 'https://exp.host/--/api/v2/push/send';
  private readonly accessToken?: string;

  constructor() {
    this.accessToken = process.env.EXPO_ACCESS_TOKEN;
  }

  /**
   * Відправити push-сповіщення через Expo Push API
   */
  async sendNotification(messages: ExpoPushMessage[]): Promise<ExpoPushResponse> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      };

      // Додаємо Access Token якщо він є (для production)
      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
      }

      const response = await axios.post<ExpoPushResponse>(
        this.expoApiUrl,
        messages,
        { headers },
      );

      const result = response.data;

      // Логуємо результати
      const successCount = result.data.filter((r) => r.status === 'ok').length;
      const errorCount = result.data.filter((r) => r.status === 'error').length;

      console.log(
        `✅ Expo Push sent: ${successCount} success, ${errorCount} errors`,
      );

      // Логуємо помилки детально
      result.data.forEach((item, index) => {
        if (item.status === 'error') {
          console.warn(
            `⚠️ Push ${index} failed: ${item.message} (${item.details?.error || 'unknown'})`,
          );
        }
      });

      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data || error.message || 'Unknown error';
      console.error(`❌ Failed to send Expo Push notification: ${JSON.stringify(errorMessage)}`);
      throw error;
    }
  }

  /**
   * Відправити одне сповіщення
   */
  async sendSingleNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    const result = await this.sendNotification([
      {
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      },
    ]);

    return result.data[0]?.status === 'ok';
  }

  /**
   * Відправити сповіщення на декілька пристроїв
   */
  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    // Expo Push API підтримує до 100 токенів в одному запиті
    const batchSize = 100;
    let totalSuccess = 0;
    let totalFailure = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const messages: ExpoPushMessage[] = batch.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      }));

      const result = await this.sendNotification(messages);

      result.data.forEach((item, index) => {
        if (item.status === 'ok') {
          totalSuccess++;
        } else {
          totalFailure++;
          // Якщо токен недійсний, додаємо його до списку для видалення
          if (
            item.details?.error === 'DeviceNotRegistered' ||
            item.message?.includes('Invalid token')
          ) {
            invalidTokens.push(batch[index]);
          }
        }
      });
    }

    return {
      successCount: totalSuccess,
      failureCount: totalFailure,
      invalidTokens,
    };
  }
}

