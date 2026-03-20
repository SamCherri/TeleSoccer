import { BotReply } from '../../bot/phase1-bot';
import { TelegramKeyboardButton, TelegramReplyKeyboardMarkup, TelegramSendMessagePayload } from './types';

const chunkActions = (actions: string[], columns = 2): TelegramKeyboardButton[][] => {
  const rows: TelegramKeyboardButton[][] = [];

  for (let index = 0; index < actions.length; index += columns) {
    rows.push(actions.slice(index, index + columns).map((action) => ({ text: action })));
  }

  return rows;
};

const appendSceneFallback = (reply: BotReply): string => {
  if (!reply.scene) {
    return reply.text;
  }

  return [
    reply.text,
    '🖼️ CENA VISUAL PREPARADA',
    `${reply.scene.title} • HUD ${reply.scene.hud}`,
    reply.scene.phrase,
    reply.scene.fallbackText
  ].join('\n\n');
};

export const botReplyToTelegramMessage = (chatId: number | string, reply: BotReply): TelegramSendMessagePayload => {
  const replyMarkup: TelegramReplyKeyboardMarkup | undefined =
    reply.actions.length > 0
      ? {
          keyboard: chunkActions(reply.actions),
          resize_keyboard: true
        }
      : undefined;

  return {
    chat_id: chatId,
    text: appendSceneFallback(reply),
    reply_markup: replyMarkup,
    scene: reply.scene
      ? {
          key: reply.scene.key,
          title: reply.scene.title,
          hud: reply.scene.hud,
          phrase: reply.scene.phrase,
          svg: reply.scene.svg,
          fallbackText: reply.scene.fallbackText
        }
      : undefined
  };
};
