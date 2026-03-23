import { TelegramSendDocumentPayload, TelegramSendMessagePayload, TelegramSendPhotoPayload } from './types';

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface TelegramHttpClient {
  sendMessage(payload: TelegramSendMessagePayload): Promise<void>;
  sendDocument(payload: TelegramSendDocumentPayload): Promise<void>;
  sendPhoto(payload: TelegramSendPhotoPayload): Promise<void>;
  setWebhook(webhookUrl: string, secretToken?: string): Promise<void>;
  getWebhookInfo(): Promise<unknown>;
  deleteWebhook(dropPendingUpdates?: boolean): Promise<void>;
}

const toMessageRecord = (payload: TelegramSendMessagePayload): Record<string, unknown> => ({
  chat_id: payload.chat_id,
  text: payload.text,
  reply_markup: payload.reply_markup
});

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: typeof error === 'string' ? error : 'Erro não identificado', value: error };
};

const logAudit = (event: string, details: Record<string, unknown>): void => {
  console.info('[telegram-client]', JSON.stringify({ event, ...details }));
};

const logFailure = (event: string, details: Record<string, unknown>, error?: unknown): void => {
  console.error('[telegram-client]', JSON.stringify({ event, ...details, ...(error === undefined ? {} : { error: serializeError(error) }) }));
};

export class TelegramBotApiClient implements TelegramHttpClient {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async sendMessage(payload: TelegramSendMessagePayload): Promise<void> {
    const auditData = { method: 'sendMessage', chatId: payload.chat_id, textLength: payload.text.length, hasReplyMarkup: Boolean(payload.reply_markup) };
    logAudit('send-message-start', auditData);
    try {
      await this.callApi('sendMessage', toMessageRecord(payload));
      logAudit('send-message-success', auditData);
    } catch (error) {
      logFailure('send-message-failed', auditData, error);
      throw error;
    }
  }

  async sendDocument(payload: TelegramSendDocumentPayload): Promise<void> {
    const auditData = { method: 'sendDocument', chatId: payload.chat_id, captionLength: payload.caption.length, filename: payload.document.filename, contentType: payload.document.contentType, hasReplyMarkup: Boolean(payload.reply_markup) };
    logAudit('send-document-start', auditData);
    try {
      await this.callMultipartApi('sendDocument', payload.chat_id, payload.caption, 'document', payload.document, payload.reply_markup);
      logAudit('send-document-success', auditData);
    } catch (error) {
      logFailure('send-document-failed', auditData, error);
      throw error;
    }
  }

  async sendPhoto(payload: TelegramSendPhotoPayload): Promise<void> {
    const auditData = { method: 'sendPhoto', chatId: payload.chat_id, captionLength: payload.caption.length, filename: payload.photo.filename, contentType: payload.photo.contentType, hasReplyMarkup: Boolean(payload.reply_markup) };
    logAudit('send-photo-start', auditData);
    try {
      await this.callMultipartApi('sendPhoto', payload.chat_id, payload.caption, 'photo', payload.photo, payload.reply_markup);
      logAudit('send-photo-success', auditData);
    } catch (error) {
      logFailure('send-photo-failed', auditData, error);
      throw error;
    }
  }

  async setWebhook(webhookUrl: string, secretToken?: string): Promise<void> {
    const auditData = { method: 'setWebhook', webhookUrl, hasSecretToken: Boolean(secretToken) };
    logAudit('set-webhook-start', auditData);
    try {
      await this.callApi('setWebhook', { url: webhookUrl, secret_token: secretToken });
      logAudit('set-webhook-success', auditData);
    } catch (error) {
      logFailure('set-webhook-failed', auditData, error);
      throw error;
    }
  }

  async getWebhookInfo(): Promise<unknown> {
    const auditData = { method: 'getWebhookInfo' };
    logAudit('get-webhook-info-start', auditData);
    try {
      const result = await this.callApi<unknown>('getWebhookInfo', {});
      logAudit('get-webhook-info-success', auditData);
      return result;
    } catch (error) {
      logFailure('get-webhook-info-failed', auditData, error);
      throw error;
    }
  }

  async deleteWebhook(dropPendingUpdates = false): Promise<void> {
    const auditData = { method: 'deleteWebhook', dropPendingUpdates };
    logAudit('delete-webhook-start', auditData);
    try {
      await this.callApi('deleteWebhook', { drop_pending_updates: dropPendingUpdates });
      logAudit('delete-webhook-success', auditData);
    } catch (error) {
      logFailure('delete-webhook-failed', auditData, error);
      throw error;
    }
  }

  private async callMultipartApi<T>(method: string, chatId: number | string, caption: string, fileField: 'document' | 'photo', file: { filename: string; contentType: string; data: Uint8Array }, replyMarkup?: unknown): Promise<T> {
    const form = new FormData();
    form.set('chat_id', String(chatId));
    form.set('caption', caption);
    const binary = Uint8Array.from(file.data).buffer;
    form.set(fileField, new Blob([binary], { type: file.contentType }), file.filename);
    if (replyMarkup) form.set('reply_markup', JSON.stringify(replyMarkup));
    return this.callApiRequest<T>(method, { method: 'POST', body: form });
  }

  private async callApi<T>(method: string, body: Record<string, unknown>): Promise<T> {
    return this.callApiRequest<T>(method, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  }

  private async callApiRequest<T>(method: string, init: RequestInit): Promise<T> {
    try {
      const response = await this.fetchImpl(`https://api.telegram.org/bot${this.token}/${method}`, init);
      const rawPayload = await response.text();
      let payload: TelegramApiResponse<T> | undefined;
      if (rawPayload) {
        try {
          payload = JSON.parse(rawPayload) as TelegramApiResponse<T>;
        } catch (error) {
          logFailure('telegram-api-invalid-json', { method, httpStatus: response.status, responseBodyPreview: rawPayload.slice(0, 500) }, error);
          throw new Error(`Telegram Bot API retornou JSON inválido no método ${method}.`);
        }
      }

      if (!response.ok) {
        const description = payload?.description ?? 'sem descrição retornada';
        logFailure('telegram-api-http-error', { method, httpStatus: response.status, description });
        throw new Error(`Telegram Bot API respondeu com HTTP ${response.status} no método ${method}: ${description}.`);
      }

      if (!payload?.ok) {
        const description = payload?.description ?? 'erro desconhecido';
        logFailure('telegram-api-declared-error', { method, httpStatus: response.status, description });
        throw new Error(`Telegram Bot API rejeitou ${method}: ${description}.`);
      }

      logAudit('telegram-api-success', { method, httpStatus: response.status });
      return payload.result as T;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error(`Falha inesperada ao chamar Telegram Bot API no método ${method}.`);
    }
  }
}
