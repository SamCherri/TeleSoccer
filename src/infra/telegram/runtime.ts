import { Phase1TelegramDispatcher } from '../../bot/phase1-dispatcher';
import { botReplyToTelegramMessage } from './presenter';
import { TelegramHttpClient } from './client';
import { TelegramSendDocumentPayload, TelegramUpdate } from './types';

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

const extractCommand = (text?: string): string | undefined => {
  const trimmed = text?.trim();
  if (!trimmed || !trimmed.startsWith('/')) {
    return undefined;
  }

  const [command] = trimmed.split(/\s+/);
  return command;
};

const isDocumentPayload = (payload: ReturnType<typeof botReplyToTelegramMessage>): payload is TelegramSendDocumentPayload => 'document' in payload;

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
      command: extractCommand(message?.text),
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
      if (isDocumentPayload(outgoingMessage)) {
        logAudit('send-document-start', {
          ...auditData,
          outgoingChatId: outgoingMessage.chat_id,
          filename: outgoingMessage.document.filename
        });
        try {
          await this.telegramClient.sendDocument(outgoingMessage);
          logAudit('send-document-finish', {
            ...auditData,
            outgoingChatId: outgoingMessage.chat_id,
            filename: outgoingMessage.document.filename
          });
        } catch (error) {
          logFailure('send-document-failed-fallback-to-text', {
            ...auditData,
            outgoingChatId: outgoingMessage.chat_id,
            filename: outgoingMessage.document.filename
          }, error);
          await this.telegramClient.sendMessage({
            chat_id: outgoingMessage.chat_id,
            text: [outgoingMessage.caption, outgoingMessage.scene.fallbackText].join('\n\n'),
            reply_markup: outgoingMessage.reply_markup,
            scene: outgoingMessage.scene
          });
          logAudit('send-message-fallback-finish', {
            ...auditData,
            outgoingChatId: outgoingMessage.chat_id
          });
        }
        return true;
      }

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
