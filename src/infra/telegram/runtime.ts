import { Phase1TelegramDispatcher } from '../../bot/phase1-dispatcher';
import { botReplyToTelegramMessage } from './presenter';
import { TelegramHttpClient } from './client';
import { TelegramUpdate } from './types';

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Erro não identificado',
    value: error
  };
};

const logAudit = (event: string, details: Record<string, unknown>): void => {
  console.info('[telegram-runtime]', JSON.stringify({ event, ...details }));
};

const logFailure = (event: string, details: Record<string, unknown>, error: unknown): void => {
  console.error('[telegram-runtime]', JSON.stringify({ event, ...details, error: serializeError(error) }));
};

export class Phase1TelegramRuntime {
  constructor(
    private readonly dispatcher: Phase1TelegramDispatcher,
    private readonly telegramClient: TelegramHttpClient
  ) {}

  async processUpdate(update: TelegramUpdate): Promise<boolean> {
    const message = update.message;
    const auditData = {
      updateId: update.update_id,
      chatId: message?.chat?.id,
      fromId: message?.from?.id,
      text: message?.text ?? '/start'
    };

    logAudit('update-received', auditData);

    if (!message?.from?.id || !message.chat?.id) {
      logAudit('update-ignored', {
        ...auditData,
        reason: 'missing-message-or-identifiers'
      });
      return false;
    }

    try {
      logAudit('dispatch-start', auditData);
      const reply = await this.dispatcher.dispatch({
        telegramId: String(message.from.id),
        text: message.text ?? '/start'
      });
      logAudit('dispatch-finish', {
        ...auditData,
        replyActionCount: reply.actions.length,
        hasScene: Boolean(reply.scene)
      });

      const outgoingMessage = botReplyToTelegramMessage(message.chat.id, reply);
      logAudit('send-message-start', {
        ...auditData,
        outgoingChatId: outgoingMessage.chat_id
      });
      await this.telegramClient.sendMessage(outgoingMessage);
      logAudit('send-message-finish', {
        ...auditData,
        outgoingChatId: outgoingMessage.chat_id
      });
      return true;
    } catch (error) {
      logFailure('process-update-failed', auditData, error);
      throw error;
    }
  }
}
