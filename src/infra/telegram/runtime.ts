import { Phase1TelegramDispatcher } from '../../bot/phase1-dispatcher';
import { botReplyToTelegramMessage } from './presenter';
import { TelegramHttpClient } from './client';
import { TelegramSendPhotoPayload, TelegramUpdate } from './types';
import { rasterizeTelegramSceneSvgToPng } from './svg-png-rasterizer';

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: typeof error === 'string' ? error : 'Erro não identificado', value: error };
};

const logAudit = (event: string, details: Record<string, unknown>): void => {
  console.info('[telegram-runtime]', JSON.stringify({ event, ...details }));
};

const logFailure = (event: string, details: Record<string, unknown>, error: unknown): void => {
  console.error('[telegram-runtime]', JSON.stringify({ event, ...details, error: serializeError(error) }));
};

const extractCommand = (text?: string): string | undefined => {
  const trimmed = text?.trim();
  if (!trimmed || !trimmed.startsWith('/')) return undefined;
  const [command] = trimmed.split(/\s+/);
  return command;
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
      command: extractCommand(message?.text),
      text: message?.text ?? '/start'
    };

    logAudit('update-received', auditData);

    if (!message?.from?.id || !message.chat?.id) {
      logAudit('update-ignored', { ...auditData, reason: 'missing-message-or-identifiers' });
      return false;
    }

    try {
      logAudit('dispatch-start', auditData);
      const reply = await this.dispatcher.dispatch({ telegramId: String(message.from.id), text: message.text ?? '/start' });
      logAudit('dispatch-finish', { ...auditData, replyActionCount: reply.actions.length, hasScene: Boolean(reply.scene) });

      const outgoingMessage = botReplyToTelegramMessage(message.chat.id, reply);
      if (outgoingMessage.scene) {
        logAudit('visual-generation-finish', { ...auditData, sceneKey: outgoingMessage.scene.key, svgLength: outgoingMessage.scene.svg.length });
        try {
          logAudit('rasterization-start', { ...auditData, sceneKey: outgoingMessage.scene.key });
          const rasterized = rasterizeTelegramSceneSvgToPng(outgoingMessage.scene.svg);
          logAudit('rasterization-finish', { ...auditData, sceneKey: outgoingMessage.scene.key, pngBytes: rasterized.png.length, width: rasterized.width, height: rasterized.height });

          const photoPayload: TelegramSendPhotoPayload = {
            chat_id: outgoingMessage.chat_id,
            caption: outgoingMessage.scene.caption,
            reply_markup: outgoingMessage.reply_markup,
            scene: outgoingMessage.scene,
            photo: {
              filename: `match-scene-${outgoingMessage.scene.key}.png`,
              contentType: 'image/png',
              data: rasterized.png
            }
          };

          logAudit('send-photo-start', { ...auditData, outgoingChatId: photoPayload.chat_id, filename: photoPayload.photo.filename });
          await this.telegramClient.sendPhoto(photoPayload);
          logAudit('send-photo-finish', { ...auditData, outgoingChatId: photoPayload.chat_id, filename: photoPayload.photo.filename });
          return true;
        } catch (error) {
          logFailure('send-photo-failed-fallback-to-text', { ...auditData, sceneKey: outgoingMessage.scene.key, outgoingChatId: outgoingMessage.chat_id }, error);
          await this.telegramClient.sendMessage(outgoingMessage);
          logAudit('send-message-fallback-finish', { ...auditData, outgoingChatId: outgoingMessage.chat_id });
          return true;
        }
      }

      logAudit('send-message-start', { ...auditData, outgoingChatId: outgoingMessage.chat_id });
      await this.telegramClient.sendMessage(outgoingMessage);
      logAudit('send-message-finish', { ...auditData, outgoingChatId: outgoingMessage.chat_id });
      return true;
    } catch (error) {
      logFailure('process-update-failed', auditData, error);
      throw error;
    }
  }
}
