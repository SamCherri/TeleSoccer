import { BotReply } from '../../bot/phase1-bot';
import { TelegramKeyboardButton, TelegramOutgoingPayload, TelegramReplyKeyboardMarkup, TelegramSendDocumentPayload, TelegramSendMessagePayload } from './types';

const chunkActions = (actions: string[], columns = 2): TelegramKeyboardButton[][] => {
  const rows: TelegramKeyboardButton[][] = [];

  for (let index = 0; index < actions.length; index += columns) {
    rows.push(actions.slice(index, index + columns).map((action) => ({ text: action })));
  }

  return rows;
};

const buildReplyMarkup = (actions: string[]): TelegramReplyKeyboardMarkup | undefined =>
  actions.length > 0
    ? {
        keyboard: chunkActions(actions),
        resize_keyboard: true
      }
    : undefined;

const appendSceneFallback = (reply: BotReply): string => {
  if (!reply.scene) {
    return reply.text;
  }

  return [reply.text, reply.scene.fallbackText].join('\n\n');
};

const buildSceneCaption = (reply: BotReply): string => [reply.text, `${reply.scene!.title} • ${reply.scene!.phrase}`].join('\n\n');

export const botReplyToTelegramMessage = (chatId: number | string, reply: BotReply): TelegramOutgoingPayload => {
  const replyMarkup = buildReplyMarkup(reply.actions);

  if (reply.scene) {
    const payload: TelegramSendDocumentPayload = {
      chat_id: chatId,
      caption: buildSceneCaption(reply),
      reply_markup: replyMarkup,
      scene: {
        key: reply.scene.key,
        title: reply.scene.title,
        hud: reply.scene.hud,
        phrase: reply.scene.phrase,
        svg: reply.scene.svg,
        fallbackText: reply.scene.fallbackText
      },
      document: {
        filename: `match-scene-${reply.scene.key}.svg`,
        contentType: 'image/svg+xml',
        data: reply.scene.svg
      }
    };

    return payload;
  }

  const payload: TelegramSendMessagePayload = {
    chat_id: chatId,
    text: appendSceneFallback(reply),
    reply_markup: replyMarkup
  };

  return payload;
};
