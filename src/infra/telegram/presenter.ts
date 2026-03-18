import { BotReply } from '../../bot/phase1-bot';
import { TelegramKeyboardButton, TelegramReplyKeyboardMarkup, TelegramSendMessagePayload } from './types';

const chunkActions = (actions: string[], columns = 2): TelegramKeyboardButton[][] => {
  const rows: TelegramKeyboardButton[][] = [];

  for (let index = 0; index < actions.length; index += columns) {
    rows.push(actions.slice(index, index + columns).map((action) => ({ text: action })));
  }

  return rows;
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
    text: reply.text,
    reply_markup: replyMarkup
  };
};
