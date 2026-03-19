import { TelegramSendMessagePayload } from './types';

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface TelegramHttpClient {
  sendMessage(payload: TelegramSendMessagePayload): Promise<void>;
  setWebhook(webhookUrl: string, secretToken?: string): Promise<void>;
}

const toRecord = (payload: TelegramSendMessagePayload): Record<string, unknown> => ({
  chat_id: payload.chat_id,
  text: payload.text,
  reply_markup: payload.reply_markup
});

export class TelegramBotApiClient implements TelegramHttpClient {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async sendMessage(payload: TelegramSendMessagePayload): Promise<void> {
    await this.callApi('sendMessage', toRecord(payload));
  }

  async setWebhook(webhookUrl: string, secretToken?: string): Promise<void> {
    await this.callApi('setWebhook', {
      url: webhookUrl,
      secret_token: secretToken
    });
  }

  private async callApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await this.fetchImpl(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Telegram Bot API respondeu com HTTP ${response.status} no método ${method}.`);
    }

    const payload = (await response.json()) as TelegramApiResponse<T>;
    if (!payload.ok) {
      throw new Error(`Telegram Bot API rejeitou ${method}: ${payload.description ?? 'erro desconhecido'}.`);
    }

    return payload.result as T;
  }
}
