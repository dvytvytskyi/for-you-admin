import axios, { AxiosInstance } from 'axios';
import { AppDataSource } from '../config/database';
import { AmoCrmToken } from '../entities/AmoCrmToken';
import { IsNull } from 'typeorm';
import { AmoCrmLead } from '../entities/AmoCrmLead';
import { AmoCrmPipeline } from '../entities/AmoCrmPipeline';
import { AmoCrmStage, LeadStatus } from '../entities/AmoCrmStage';
import { AmoCrmUser } from '../entities/AmoCrmUser';
import { AmoCrmContact } from '../entities/AmoCrmContact';
import { AmoCrmTask, AmoTaskType } from '../entities/AmoCrmTask';

// Інтерфейси відповідно до AMO CRM API
export interface AmoAuthResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface AmoPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  is_unsorted_on: boolean;
  is_archive: boolean;
  account_id: number;
  _embedded?: {
    statuses?: AmoStatus[];
  };
}

export interface AmoStatus {
  id: number;
  name: string;
  sort: number;
  is_editable: boolean;
  color?: string;
  pipeline_id: number;
  type?: number; // Тип статусу: 0 - звичайна, 1 - неразобранное, 142 - успішно, 143 - нереалізовано
}

export interface AmoUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
  is_free?: boolean;
  is_admin?: boolean;
  rights?: any;
  account_id?: number;
}

export interface AmoTask {
  id: number;
  entity_id: number;
  entity_type: string;
  task_type: number;
  text?: string;
  result?: {
    text?: string;
  };
  responsible_user_id?: number;
  created_by?: number;
  complete_till?: number;
  is_completed?: boolean;
  created_at?: number;
  updated_at?: number;
}

export interface AmoLead {
  id?: number;
  name: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  created_at?: number;
  updated_at?: number;
  custom_fields_values?: AmoCustomField[];
  _embedded?: {
    contacts?: Array<{ id: number }>;
    companies?: Array<{ id: number }>;
  };
}

export interface AmoContact {
  id?: number;
  name: string;
  first_name?: string;
  last_name?: string;
  responsible_user_id?: number;
  created_at?: number;
  updated_at?: number;
  custom_fields_values?: AmoCustomField[];
}

export interface AmoCustomField {
  field_id: number;
  field_name?: string;
  field_code?: string;
  field_type?: string;
  values: Array<{
    value: string | number;
    enum_id?: number;
    enum_code?: string;
  }>;
}

export interface AmoWebhookPayload {
  leads?: {
    status?: Array<{
      id: number;
      status_id: number;
      pipeline_id: number;
      old_status_id?: number;
    }>;
    add?: Array<{ id: number }>;
    update?: Array<{ id: number }>;
    delete?: Array<{ id: number }>;
  };
  contacts?: {
    add?: Array<{ id: number }>;
    update?: Array<{ id: number }>;
  };
  tasks?: {
    add?: Array<{ id: number }>;
    update?: Array<{ id: number }>;
    delete?: Array<{ id: number }>;
  };
  account?: {
    id: string;
    subdomain: string;
  };
}

export class AmoCrmService {
  private axiosInstance: AxiosInstance;
  private readonly domain: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly accountId: string;
  private readonly apiDomain: string;
  private readonly mainBackendUrl: string;
  private readonly mainBackendApiKey: string;

  constructor() {
    this.domain = process.env.AMO_DOMAIN || '';
    this.clientId = process.env.AMO_CLIENT_ID || '';
    this.clientSecret = process.env.AMO_CLIENT_SECRET || '';
    this.redirectUri = process.env.AMO_REDIRECT_URI || '';
    this.accountId = process.env.AMO_ACCOUNT_ID || '';
    this.apiDomain = process.env.AMO_API_DOMAIN || '';
    this.mainBackendUrl = process.env.MAIN_BACKEND_URL || '';
    this.mainBackendApiKey = process.env.MAIN_BACKEND_API_KEY || '';

    this.axiosInstance = axios.create({
      baseURL: `https://${this.domain}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Отримати access token (спочатку з локальної БД, потім з Main Backend)
   * @param userId - опціональний ID користувача. Якщо не передано, використовується глобальний токен
   */
  private async getAccessToken(userId?: string): Promise<string> {
    // Спочатку перевіряємо локальне зберігання
    try {
      const tokenRepo = AppDataSource.getRepository(AmoCrmToken);
      
      // Якщо передано userId, шукаємо токен для користувача
      // Якщо не передано, шукаємо глобальний токен (без userId)
      const whereCondition = userId 
        ? { userId } 
        : { userId: IsNull() };
      
      const token = await tokenRepo.findOne({
        where: whereCondition,
        order: { createdAt: 'DESC' },
      });

      if (token && token.expiresAt > new Date()) {
        console.log(`Using local AMO CRM token${userId ? ` for user ${userId}` : ' (global)'}`);
        return token.accessToken;
      }

      // Якщо токен прострочений, спробуємо оновити через refresh token
      if (token && token.refreshToken) {
        try {
          const refreshed = await this.refreshAccessToken(token.refreshToken, userId);
          return refreshed.access_token;
        } catch (refreshError) {
          console.error('Failed to refresh token, trying Main Backend:', refreshError);
        }
      }
    } catch (localError) {
      console.log('Local token storage not available, trying Main Backend');
    }

    // Fallback: отримати з Main Backend (тільки якщо не передано userId)
    if (!userId) {
      try {
        const response = await axios.get(`${this.mainBackendUrl}/integrations/amo-crm/token`, {
          headers: {
            'X-API-Key': this.mainBackendApiKey,
          },
        });

        return response.data.accessToken;
      } catch (error) {
        console.error('Failed to get token from main backend:', error);
        throw new Error('AMO CRM not authorized. Please authorize first.');
      }
    }

    throw new Error('AMO CRM not authorized for this user. Please authorize first.');
  }

  /**
   * Оновити access token через refresh token
   */
  private async refreshAccessToken(refreshToken: string, userId?: string): Promise<AmoAuthResponse> {
    try {
      const response = await axios.post<AmoAuthResponse>(
        `https://${this.domain}/oauth2/access_token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          redirect_uri: this.redirectUri,
        },
      );

      if (userId) {
        await this.saveTokensForUser(userId, response.data);
      } else {
        await this.saveTokensLocally(response.data);
      }
      return response.data;
    } catch (error: any) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Зберегти токени локально (fallback, глобальні токени без userId)
   */
  async saveTokensLocally(authData: AmoAuthResponse | { access_token: string; refresh_token?: string; expires_in: number; token_type?: string }): Promise<void> {
    try {
      const tokenRepo = AppDataSource.getRepository(AmoCrmToken);
      
      // Видалити старі глобальні токени (без userId)
      await tokenRepo.delete({ userId: IsNull() });

      // Створити новий токен
      const expiresAt = new Date();
      // Якщо expires_in дуже великий (більше 1 року), встановлюємо максимальний термін
      const expiresInSeconds = authData.expires_in > 31536000 
        ? Math.min(authData.expires_in, 157680000) // Максимум 5 років
        : authData.expires_in;
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      const token = tokenRepo.create({
        userId: undefined, // Глобальний токен
        accessToken: authData.access_token,
        refreshToken: authData.refresh_token,
        expiresIn: authData.expires_in,
        expiresAt,
        tokenType: authData.token_type,
      });

      await tokenRepo.save(token);
      console.log('AMO CRM tokens saved locally (global)');
    } catch (error) {
      console.error('Failed to save tokens locally:', error);
      // Не кидаємо помилку, бо це fallback
    }
  }

  /**
   * Зберегти токени для конкретного користувача
   */
  async saveTokensForUser(userId: string, authData: AmoAuthResponse | { access_token: string; refresh_token?: string; expires_in: number; token_type?: string }): Promise<void> {
    try {
      const tokenRepo = AppDataSource.getRepository(AmoCrmToken);
      
      // Видалити старі токени для цього користувача
      await tokenRepo.delete({ userId });

      // Створити новий токен
      const expiresAt = new Date();
      const expiresInSeconds = authData.expires_in > 31536000 
        ? Math.min(authData.expires_in, 157680000)
        : authData.expires_in;
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      const token = tokenRepo.create({
        userId,
        accessToken: authData.access_token,
        refreshToken: authData.refresh_token,
        expiresIn: authData.expires_in,
        expiresAt,
        tokenType: authData.token_type,
      });

      await tokenRepo.save(token);
      console.log(`AMO CRM tokens saved for user ${userId}`);
    } catch (error) {
      console.error(`Failed to save tokens for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Обмін API ключа на authorization code
   */
  async exchangeApiKeyForCode(login: string, apiKey: string, state?: string): Promise<void> {
    try {
      console.log(`Exchanging API key for authorization code`);
      console.log(`Login: ${login}, Domain: ${this.domain}`);

      await axios.post(
        `https://${this.domain}/oauth2/exchange_api_key`,
        {
          login,
          api_key: apiKey,
          client_uuid: this.clientId,
          client_secret: this.clientSecret,
          ...(state && { state }),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('API key exchange request accepted. Authorization code will be sent to redirect URI.');
    } catch (error: any) {
      console.error('Error exchanging API key:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to exchange API key');
    }
  }

  /**
   * Обмін authorization code на токени (глобальний, для адмінів)
   */
  async exchangeCode(code: string): Promise<AmoAuthResponse> {
    try {
      console.log(`Starting OAuth exchange with domain: ${this.domain}`);

      const response = await axios.post<AmoAuthResponse>(
        `https://${this.domain}/oauth2/access_token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        },
      );

      // Зберегти токени в Main Backend та локально (глобально)
      await Promise.all([
        this.saveTokensToMainBackend(response.data).catch(err => 
          console.warn('Failed to save tokens to Main Backend:', err)
        ),
        this.saveTokensLocally(response.data).catch(err => 
          console.warn('Failed to save tokens locally:', err)
        ),
      ]);

      console.log('AMO CRM tokens successfully obtained and saved');
      return response.data;
    } catch (error: any) {
      console.error('Error exchanging authorization code:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Обмін authorization code на токени для конкретного користувача
   */
  async exchangeCodeForUser(userId: string, code: string): Promise<AmoAuthResponse> {
    try {
      console.log(`Starting OAuth exchange for user ${userId} with domain: ${this.domain}`);

      const response = await axios.post<AmoAuthResponse>(
        `https://${this.domain}/oauth2/access_token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        },
      );

      // Зберегти токени для користувача
      await this.saveTokensForUser(userId, response.data);

      console.log(`AMO CRM tokens successfully obtained and saved for user ${userId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error exchanging authorization code for user ${userId}:`, error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }

  /**
   * Зберегти токени в Main Backend
   */
  private async saveTokensToMainBackend(authData: AmoAuthResponse): Promise<void> {
    await axios.post(
      `${this.mainBackendUrl}/integrations/amo-crm/set-tokens`,
      {
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        expires_in: authData.expires_in,
      },
      {
        headers: {
          'X-API-Key': this.mainBackendApiKey,
        },
      },
    );
  }

  /**
   * Перевірити статус підключення (глобальний, для адмінів)
   */
  async getConnectionStatus(): Promise<{
    connected: boolean;
    hasTokens: boolean;
    domain: string;
    accountId: string;
  }> {
    try {
      const token = await this.getAccessToken();
      return {
        connected: true,
        hasTokens: !!token,
        domain: this.domain,
        accountId: this.accountId,
      };
    } catch (error) {
      return {
        connected: false,
        hasTokens: false,
        domain: this.domain,
        accountId: this.accountId,
      };
    }
  }

  /**
   * Перевірити статус підключення для конкретного користувача
   */
  async getUserConnectionStatus(userId: string): Promise<{
    connected: boolean;
    hasTokens: boolean;
    domain: string;
    accountId: string;
  }> {
    try {
      const token = await this.getAccessToken(userId);
      return {
        connected: true,
        hasTokens: !!token,
        domain: this.domain,
        accountId: this.accountId,
      };
    } catch (error) {
      return {
        connected: false,
        hasTokens: false,
        domain: this.domain,
        accountId: this.accountId,
      };
    }
  }

  /**
   * Відключити AMO CRM для користувача (видалити токени)
   */
  async disconnectUser(userId: string): Promise<void> {
    try {
      const tokenRepo = AppDataSource.getRepository(AmoCrmToken);
      await tokenRepo.delete({ userId });
      console.log(`AMO CRM disconnected for user ${userId}`);
    } catch (error) {
      console.error(`Failed to disconnect AMO CRM for user ${userId}:`, error);
      throw new Error('Failed to disconnect AMO CRM');
    }
  }

  /**
   * Отримати pipelines та stages з AMO CRM (без збереження)
   */
  async getPipelines(): Promise<AmoPipeline[]> {
    try {
      const accessToken = await this.getAccessToken();
      const apiUrl = this.domain;

      const response = await axios.get<{ _embedded: { pipelines: AmoPipeline[] } }>(
        `https://${apiUrl}/api/v4/leads/pipelines`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data._embedded?.pipelines || [];
    } catch (error: any) {
      console.error('[AMO CRM] Error getting pipelines:', error.response?.data || error.message);
      throw new Error(`Failed to get pipelines from AMO CRM: ${error.message}`);
    }
  }

  /**
   * Мапінг статусів AMO CRM на наші статуси
   */
  private mapAmoStatusToLeadStatus(status: AmoStatus): LeadStatus | undefined {
    // Статуси типу 142 - успішно реалізовано
    if (status.type === 142) {
      return LeadStatus.CLOSED_WON;
    }
    // Статуси типу 143 - закрито і не реалізовано
    if (status.type === 143) {
      return LeadStatus.CLOSED_LOST;
    }
    // Статуси типу 1 - неразобранное (новий)
    if (status.type === 1) {
      return LeadStatus.NEW;
    }
    // Інші статуси - в роботі
    if (status.type === 0) {
      // Можна додати логіку для визначення QUALIFIED на основі назви
      const nameLower = status.name.toLowerCase();
      if (nameLower.includes('квалификац') || nameLower.includes('qualif')) {
        return LeadStatus.QUALIFIED;
      }
      return LeadStatus.IN_PROGRESS;
    }
    return undefined;
  }

  /**
   * Синхронізація pipelines та stages з AMO CRM
   */
  async syncPipelines(): Promise<{ synced: number; errors: number }> {
    try {
      const accessToken = await this.getAccessToken();

      // Отримати pipelines з AMO CRM
      const apiUrl = this.domain;
      const response = await axios.get<{ _embedded: { pipelines: AmoPipeline[] } }>(
        `https://${apiUrl}/api/v4/leads/pipelines`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const pipelines = response.data._embedded?.pipelines || [];
      const pipelineRepo = AppDataSource.getRepository(AmoCrmPipeline);
      const stageRepo = AppDataSource.getRepository(AmoCrmStage);
      let synced = 0;
      let errors = 0;

      // Зберегти pipelines та stages локально
      for (const pipeline of pipelines) {
        try {
          // Перевірити чи pipeline вже існує
          const existingPipeline = await pipelineRepo.findOne({
            where: { amoPipelineId: pipeline.id },
          });

          const pipelineData: any = {
            amoPipelineId: pipeline.id,
            name: pipeline.name,
            sort: pipeline.sort,
            isMain: pipeline.is_main,
            isUnsortedOn: pipeline.is_unsorted_on,
            isArchive: pipeline.is_archive,
            accountId: pipeline.account_id,
            rawData: pipeline,
          };

          let savedPipeline: AmoCrmPipeline | null = null;
          if (existingPipeline) {
            await pipelineRepo.update({ amoPipelineId: pipeline.id }, pipelineData);
            savedPipeline = existingPipeline;
          } else {
            savedPipeline = await pipelineRepo.save(pipelineRepo.create(pipelineData));
          }
          
          if (!savedPipeline) {
            errors++;
            continue;
          }

          // Синхронізувати stages
          const stages = pipeline._embedded?.statuses || [];
          for (const stage of stages) {
            const existingStage = await stageRepo.findOne({
              where: { amoStageId: stage.id },
            });

            const mappedStatus = this.mapAmoStatusToLeadStatus(stage);
            const stageData: any = {
              amoStageId: stage.id,
              pipelineId: savedPipeline.id,
              amoPipelineId: pipeline.id,
              name: stage.name,
              sort: stage.sort,
              isEditable: stage.is_editable,
              color: stage.color ?? undefined,
              statusType: stage.type ?? undefined,
              mappedStatus,
              accountId: pipeline.account_id,
              rawData: stage,
            };

            if (existingStage) {
              await stageRepo.update({ amoStageId: stage.id }, stageData);
            } else {
              const newStage = stageRepo.create(stageData);
              await stageRepo.save(newStage);
            }
          }

          synced++;

          // Також спробувати відправити в Main Backend (якщо налаштовано)
          if (this.mainBackendUrl && this.mainBackendApiKey) {
            try {
              await axios.post(
                `${this.mainBackendUrl}/integrations/amo-crm/sync-pipelines`,
                {
                  pipelines: [pipeline],
                  stages: stages,
                },
                {
                  headers: {
                    'X-API-Key': this.mainBackendApiKey,
                  },
                },
              );
            } catch (mainBackendError: any) {
              console.warn(`[AMO CRM] Failed to sync pipeline ${pipeline.id} to Main Backend:`, mainBackendError.message);
            }
          }
        } catch (error: any) {
          console.error(`[AMO CRM] Error syncing pipeline ${pipeline.id}:`, error.message);
          errors++;
        }
      }

      console.log(`[AMO CRM] Synced ${synced} pipelines, ${errors} errors`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[AMO CRM] Error syncing pipelines:', error.response?.data || error.message);
      throw new Error('Failed to sync pipelines from AMO CRM');
    }
  }

  /**
   * Синхронізація leads з AMO CRM
   */
  async syncLeads(limit: number = 50): Promise<{ synced: number; errors: number }> {
    try {
      const accessToken = await this.getAccessToken();
      console.log(`[AMO CRM] Syncing leads, limit: ${limit}, API Domain: ${this.apiDomain}`);

      // Отримати leads з AMO CRM
      // Використовуємо domain замість apiDomain, оскільки токен видано для domain
      const apiUrl = this.domain; // Використовуємо domain, а не apiDomain
      console.log(`[AMO CRM] Requesting leads from: https://${apiUrl}/api/v4/leads`);
      console.log(`[AMO CRM] Access token length: ${accessToken.length}, preview: ${accessToken.substring(0, 30)}...`);
      
      const response = await axios.get<{ _embedded: { leads: AmoLead[] } }>(
        `https://${apiUrl}/api/v4/leads`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            limit,
            with: 'contacts', // Отримати також контакти
          },
          validateStatus: (status) => status < 500, // Не кидати помилку для 4xx
        },
      );

      if (response.status === 401) {
        console.error('[AMO CRM] 401 Unauthorized - Token may be invalid or expired');
        console.error('[AMO CRM] Response:', response.data);
        throw new Error('AMO CRM authentication failed. Token may be invalid or expired.');
      }

      if (response.status !== 200) {
        console.error(`[AMO CRM] Unexpected status: ${response.status}`, response.data);
        throw new Error(`AMO CRM API returned status ${response.status}`);
      }

      const leads = response.data._embedded?.leads || [];
      console.log(`[AMO CRM] Received ${leads.length} leads from AMO CRM`);

      const leadRepo = AppDataSource.getRepository(AmoCrmLead);
      let synced = 0;
      let errors = 0;

      // Зберегти leads локально в БД
      for (const lead of leads) {
        if (!lead.id) {
          console.warn(`[AMO CRM] Lead without ID, skipping`);
          errors++;
          continue;
        }

        try {
          // Перевірити, чи lead вже існує
          const existingLead = await leadRepo.findOne({
            where: { amoLeadId: lead.id },
          });

          const leadData: any = {
            amoLeadId: lead.id,
            name: lead.name,
            price: lead.price ?? undefined,
            statusId: lead.status_id ?? undefined,
            pipelineId: lead.pipeline_id ?? undefined,
            responsibleUserId: lead.responsible_user_id ?? undefined,
            createdAtAmo: lead.created_at ?? undefined,
            updatedAtAmo: lead.updated_at ?? undefined,
            customFields: lead.custom_fields_values ?? undefined,
            embedded: lead._embedded ?? undefined,
            rawData: lead, // Зберегти повні дані
          };

          if (existingLead) {
            // Оновити існуючий lead
            await leadRepo.update({ amoLeadId: lead.id }, leadData);
            synced++;
          } else {
            // Створити новий lead
            const newLead = leadRepo.create(leadData);
            await leadRepo.save(newLead);
            synced++;
          }

          // Також спробувати відправити в Main Backend (якщо налаштовано)
          if (this.mainBackendUrl && this.mainBackendApiKey) {
            try {
              await axios.post(
                `${this.mainBackendUrl}/integrations/amo-crm/sync-lead`,
                { lead },
                {
                  headers: {
                    'X-API-Key': this.mainBackendApiKey,
                  },
                },
              );
            } catch (mainBackendError: any) {
              // Не критична помилка, просто логуємо
              console.warn(`[AMO CRM] Failed to sync lead ${lead.id} to Main Backend:`, mainBackendError.message);
            }
          }
        } catch (error: any) {
          console.error(`[AMO CRM] Error saving lead ${lead.id}:`, error.message);
          errors++;
        }
      }

      console.log(`[AMO CRM] Synced ${synced} leads, ${errors} errors`);
      return { synced, errors };
    } catch (error: any) {
      console.error('[AMO CRM] Error syncing leads:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        throw new Error('AMO CRM authentication failed. Please check your tokens.');
      }
      throw new Error(`Failed to sync leads from AMO CRM: ${error.message}`);
    }
  }

  /**
   * Синхронізація contacts з AMO CRM
   */
  async syncContacts(limit: number = 50): Promise<{ synced: number; errors: number }> {
    try {
      const accessToken = await this.getAccessToken();
      const apiUrl = this.domain;

      const response = await axios.get<{ _embedded: { contacts: AmoContact[] } }>(
        `https://${apiUrl}/api/v4/contacts`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: { limit },
        },
      );

      const contacts = response.data._embedded?.contacts || [];
      const contactRepo = AppDataSource.getRepository(AmoCrmContact);
      let synced = 0;
      let errors = 0;

      for (const contact of contacts) {
        if (!contact.id) continue;

        try {
          const existingContact = await contactRepo.findOne({
            where: { amoContactId: contact.id },
          });

          const contactData: any = {
            amoContactId: contact.id,
            name: contact.name,
            firstName: contact.first_name ?? undefined,
            lastName: contact.last_name ?? undefined,
            email: this.extractEmailFromCustomFields(contact.custom_fields_values),
            phone: this.extractPhoneFromCustomFields(contact.custom_fields_values),
            responsibleUserId: contact.responsible_user_id ?? undefined,
            createdAtAmo: contact.created_at ?? undefined,
            updatedAtAmo: contact.updated_at ?? undefined,
            customFields: contact.custom_fields_values ?? undefined,
            rawData: contact,
          };

          if (existingContact) {
            await contactRepo.update({ amoContactId: contact.id }, contactData);
          } else {
            const newContact = contactRepo.create(contactData);
            await contactRepo.save(newContact);
          }
          synced++;
        } catch (error: any) {
          console.error(`[AMO CRM] Error saving contact ${contact.id}:`, error.message);
          errors++;
        }
      }

      return { synced, errors };
    } catch (error: any) {
      console.error('[AMO CRM] Error syncing contacts:', error.response?.data || error.message);
      throw new Error(`Failed to sync contacts from AMO CRM: ${error.message}`);
    }
  }

  /**
   * Синхронізація users з AMO CRM
   */
  async syncUsers(): Promise<{ synced: number; errors: number }> {
    try {
      const accessToken = await this.getAccessToken();
      const apiUrl = this.domain;

      const response = await axios.get<{ _embedded: { users: AmoUser[] } }>(
        `https://${apiUrl}/api/v4/users`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const users = response.data._embedded?.users || [];
      const userRepo = AppDataSource.getRepository(AmoCrmUser);
      let synced = 0;
      let errors = 0;

      for (const user of users) {
        try {
          const existingUser = await userRepo.findOne({
            where: { amoUserId: user.id },
          });

          const userData: any = {
            amoUserId: user.id,
            name: user.name,
            email: user.email ?? undefined,
            phone: user.phone ?? undefined,
            isActive: user.is_active ?? true,
            isFree: user.is_free ?? false,
            isAdmin: user.is_admin ?? false,
            rights: user.rights ?? undefined,
            accountId: parseInt(this.accountId),
            rawData: user,
          };

          if (existingUser) {
            await userRepo.update({ amoUserId: user.id }, userData);
          } else {
            const newUser = userRepo.create(userData);
            await userRepo.save(newUser);
          }
          synced++;
        } catch (error: any) {
          console.error(`[AMO CRM] Error saving user ${user.id}:`, error.message);
          errors++;
        }
      }

      return { synced, errors };
    } catch (error: any) {
      console.error('[AMO CRM] Error syncing users:', error.response?.data || error.message);
      throw new Error(`Failed to sync users from AMO CRM: ${error.message}`);
    }
  }

  /**
   * Синхронізація tasks з AMO CRM
   */
  async syncTasks(limit: number = 50): Promise<{ synced: number; errors: number }> {
    try {
      const accessToken = await this.getAccessToken();
      const apiUrl = this.domain;

      const response = await axios.get<{ _embedded: { tasks: AmoTask[] } }>(
        `https://${apiUrl}/api/v4/tasks`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: { limit },
        },
      );

      const tasks = response.data._embedded?.tasks || [];
      const taskRepo = AppDataSource.getRepository(AmoCrmTask);
      let synced = 0;
      let errors = 0;

      for (const task of tasks) {
        if (!task.id) continue;

        try {
          const existingTask = await taskRepo.findOne({
            where: { amoTaskId: task.id },
          });

          const entityType = task.entity_type === '1' || task.entity_type === 'contacts' ? 'contacts' 
            : task.entity_type === '2' || task.entity_type === 'leads' ? 'leads' 
            : 'companies';
          const mappedType = this.mapTaskType(task.task_type);

          const taskData: any = {
            amoTaskId: task.id,
            entityId: task.entity_id,
            entityType,
            taskType: task.task_type,
            mappedType,
            text: task.text ?? undefined,
            resultText: task.result?.text ?? undefined,
            responsibleUserId: task.responsible_user_id ?? undefined,
            createdBy: task.created_by ?? undefined,
            completeTill: task.complete_till ?? undefined,
            isCompleted: task.is_completed ?? false,
            createdAtAmo: task.created_at ?? undefined,
            updatedAtAmo: task.updated_at ?? undefined,
            rawData: task,
          };

          if (existingTask) {
            await taskRepo.update({ amoTaskId: task.id }, taskData);
          } else {
            const newTask = taskRepo.create(taskData);
            await taskRepo.save(newTask);
          }
          synced++;
        } catch (error: any) {
          console.error(`[AMO CRM] Error saving task ${task.id}:`, error.message);
          errors++;
        }
      }

      return { synced, errors };
    } catch (error: any) {
      console.error('[AMO CRM] Error syncing tasks:', error.response?.data || error.message);
      throw new Error(`Failed to sync tasks from AMO CRM: ${error.message}`);
    }
  }

  /**
   * Мапінг типу задачі AMO CRM на наші типи
   */
  private mapTaskType(taskTypeId: number): AmoTaskType {
    // AMO CRM task types: 1 - Call, 2 - Meeting, 3 - Email, 4 - Task, 5 - Note
    switch (taskTypeId) {
      case 1: return AmoTaskType.CALL;
      case 2: return AmoTaskType.MEETING;
      case 3: return AmoTaskType.EMAIL;
      case 4: return AmoTaskType.OTHER;
      case 5: return AmoTaskType.NOTE;
      default: return AmoTaskType.OTHER;
    }
  }

  /**
   * Витягти email з custom fields
   */
  private extractEmailFromCustomFields(customFields?: AmoCustomField[]): string | undefined {
    if (!customFields) return undefined;
    const emailField = customFields.find(f => f.field_code === 'EMAIL' || f.field_name?.toLowerCase().includes('email'));
    return emailField?.values?.[0]?.value?.toString();
  }

  /**
   * Витягти phone з custom fields
   */
  private extractPhoneFromCustomFields(customFields?: AmoCustomField[]): string | undefined {
    if (!customFields) return undefined;
    const phoneField = customFields.find(f => f.field_code === 'PHONE' || f.field_name?.toLowerCase().includes('phone'));
    return phoneField?.values?.[0]?.value?.toString();
  }

  /**
   * Створити lead в AMO CRM
   */
  async createLead(leadData: Partial<AmoLead>): Promise<number> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post<{ _embedded: { leads: Array<{ id: number }> } }>(
        `https://${this.apiDomain}/api/v4/leads`,
        [leadData],
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const leadId = response.data._embedded?.leads[0]?.id;
      if (!leadId) {
        throw new Error('Failed to get lead ID from AMO CRM response');
      }

      console.log(`Lead created in AMO CRM: ${leadId}`);
      return leadId;
    } catch (error: any) {
      console.error('Error creating lead in AMO CRM:', error.response?.data || error.message);
      throw new Error('Failed to create lead in AMO CRM');
    }
  }

  /**
   * Оновити lead в AMO CRM
   */
  async updateLead(leadId: number, leadData: Partial<AmoLead>): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const apiUrl = this.apiDomain || this.domain;
      await axios.patch(
        `https://${apiUrl}/api/v4/leads/${leadId}`,
        leadData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      console.log(`Lead ${leadId} updated in AMO CRM`);
    } catch (error: any) {
      console.error('Error updating lead in AMO CRM:', error.response?.data || error.message);
      throw new Error('Failed to update lead in AMO CRM');
    }
  }

  /**
   * Отримати lead з AMO CRM
   */
  async getLead(leadId: number): Promise<AmoLead> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get<{ _embedded: { leads: AmoLead[] } }>(
        `https://${this.apiDomain}/api/v4/leads/${leadId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      return response.data._embedded?.leads[0];
    } catch (error: any) {
      console.error('Error getting lead from AMO CRM:', error.response?.data || error.message);
      throw new Error('Failed to get lead from AMO CRM');
    }
  }

  /**
   * Обробити webhook від AMO CRM
   */
  async processWebhook(payload: AmoWebhookPayload): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    console.log('Processing webhook from AMO CRM:', JSON.stringify(payload, null, 2));

    // Обробка зміни статусу lead
    if (payload.leads?.status) {
      for (const statusUpdate of payload.leads.status) {
        try {
          // Відправити в Main Backend для обробки
          await axios.post(
            `${this.mainBackendUrl}/integrations/amo-crm/webhook`,
            {
              leads: {
                status: [statusUpdate],
              },
            },
            {
              headers: {
                'X-API-Key': this.mainBackendApiKey,
              },
            },
          );
          processed++;
        } catch (error) {
          console.error(`Error processing status update for lead ${statusUpdate.id}:`, error);
          errors++;
        }
      }
    }

    // Обробка нових leads
    if (payload.leads?.add) {
      for (const newLead of payload.leads.add) {
        try {
          const amoLead = await this.getLead(newLead.id);
          await axios.post(
            `${this.mainBackendUrl}/integrations/amo-crm/sync-lead`,
            { lead: amoLead },
            {
              headers: {
                'X-API-Key': this.mainBackendApiKey,
              },
            },
          );
          processed++;
        } catch (error) {
          console.error(`Error processing new lead ${newLead.id}:`, error);
          errors++;
        }
      }
    }

    return { processed, errors };
  }
}

