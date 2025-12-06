import axios, { AxiosInstance } from 'axios';
import { AppDataSource } from '../config/database';
import { AmoCrmToken } from '../entities/AmoCrmToken';

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
   */
  private async getAccessToken(): Promise<string> {
    // Спочатку перевіряємо локальне зберігання
    try {
      const tokenRepo = AppDataSource.getRepository(AmoCrmToken);
      const token = await tokenRepo.findOne({
        order: { createdAt: 'DESC' },
      });

      if (token && token.expiresAt > new Date()) {
        console.log('Using local AMO CRM token');
        return token.accessToken;
      }

      // Якщо токен прострочений, спробуємо оновити через refresh token
      if (token && token.refreshToken) {
        try {
          const refreshed = await this.refreshAccessToken(token.refreshToken);
          return refreshed.access_token;
        } catch (refreshError) {
          console.error('Failed to refresh token, trying Main Backend:', refreshError);
        }
      }
    } catch (localError) {
      console.log('Local token storage not available, trying Main Backend');
    }

    // Fallback: отримати з Main Backend
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

  /**
   * Оновити access token через refresh token
   */
  private async refreshAccessToken(refreshToken: string): Promise<AmoAuthResponse> {
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

      await this.saveTokensLocally(response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Зберегти токени локально (fallback)
   */
  async saveTokensLocally(authData: AmoAuthResponse | { access_token: string; refresh_token?: string; expires_in: number; token_type?: string }): Promise<void> {
    try {
      const tokenRepo = AppDataSource.getRepository(AmoCrmToken);
      
      // Видалити старі токени
      await tokenRepo.clear();

      // Створити новий токен
      const expiresAt = new Date();
      // Якщо expires_in дуже великий (більше 1 року), встановлюємо максимальний термін
      const expiresInSeconds = authData.expires_in > 31536000 
        ? Math.min(authData.expires_in, 157680000) // Максимум 5 років
        : authData.expires_in;
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresInSeconds);

      const token = tokenRepo.create({
        accessToken: authData.access_token,
        refreshToken: authData.refresh_token,
        expiresIn: authData.expires_in,
        expiresAt,
        tokenType: authData.token_type,
      });

      await tokenRepo.save(token);
      console.log('AMO CRM tokens saved locally');
    } catch (error) {
      console.error('Failed to save tokens locally:', error);
      // Не кидаємо помилку, бо це fallback
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
   * Обмін authorization code на токени
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

      // Зберегти токени в Main Backend та локально
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
   * Перевірити статус підключення
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
   * Синхронізація pipelines та stages з AMO CRM
   */
  async syncPipelines(): Promise<{ synced: number; errors: number }> {
    try {
      const accessToken = await this.getAccessToken();

      // Отримати pipelines з AMO CRM
      const response = await axios.get<{ _embedded: { pipelines: AmoPipeline[] } }>(
        `https://${this.apiDomain}/api/v4/leads/pipelines`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const pipelines = response.data._embedded?.pipelines || [];
      let synced = 0;
      let errors = 0;

      // Відправити дані в Main Backend
      for (const pipeline of pipelines) {
        try {
          await axios.post(
            `${this.mainBackendUrl}/integrations/amo-crm/sync-pipelines`,
            {
              pipelines: [pipeline],
              stages: pipeline._embedded?.statuses || [],
            },
            {
              headers: {
                'X-API-Key': this.mainBackendApiKey,
              },
            },
          );
          synced++;
        } catch (error) {
          console.error(`Error syncing pipeline ${pipeline.id}:`, error);
          errors++;
        }
      }

      console.log(`Synced ${synced} pipelines, ${errors} errors`);
      return { synced, errors };
    } catch (error: any) {
      console.error('Error syncing pipelines:', error.response?.data || error.message);
      throw new Error('Failed to sync pipelines from AMO CRM');
    }
  }

  /**
   * Синхронізація leads з AMO CRM
   */
  async syncLeads(limit: number = 50): Promise<{ synced: number; errors: number }> {
    try {
      const accessToken = await this.getAccessToken();

      // Отримати leads з AMO CRM
      const response = await axios.get<{ _embedded: { leads: AmoLead[] } }>(
        `https://${this.apiDomain}/api/v4/leads`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit,
          },
        },
      );

      const leads = response.data._embedded?.leads || [];
      let synced = 0;
      let errors = 0;

      // Відправити дані в Main Backend
      for (const lead of leads) {
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
          synced++;
        } catch (error) {
          console.error(`Error syncing lead ${lead.id}:`, error);
          errors++;
        }
      }

      console.log(`Synced ${synced} leads, ${errors} errors`);
      return { synced, errors };
    } catch (error: any) {
      console.error('Error syncing leads:', error.response?.data || error.message);
      throw new Error('Failed to sync leads from AMO CRM');
    }
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

      await axios.patch(
        `https://${this.apiDomain}/api/v4/leads/${leadId}`,
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

