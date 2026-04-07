import axios from 'axios';

export class TelegramService {
  private readonly token: string;
  private readonly chatId: string;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '';
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.token || !this.chatId) {
      console.warn('[TELEGRAM] Bot token or Chat ID missing');
      return;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        chat_id: this.chatId,
        text,
        parse_mode: 'HTML',
      });
    } catch (error: any) {
      console.error('[TELEGRAM] Error sending message:', error.response?.data || error.message);
    }
  }
}
