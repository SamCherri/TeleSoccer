export interface TelegramUser {
  id: number;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramKeyboardButton {
  text: string;
}

export interface TelegramReplyKeyboardMarkup {
  keyboard: TelegramKeyboardButton[][];
  resize_keyboard: boolean;
}

export interface TelegramSendMessagePayload {
  chat_id: number | string;
  text: string;
  reply_markup?: TelegramReplyKeyboardMarkup;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const isTelegramUpdate = (value: unknown): value is TelegramUpdate => {
  if (!isObject(value) || typeof value.update_id !== 'number') {
    return false;
  }

  if (value.message === undefined) {
    return true;
  }

  if (!isObject(value.message) || typeof value.message.message_id !== 'number') {
    return false;
  }

  const { chat, from, text } = value.message;
  if (!isObject(chat) || typeof chat.id !== 'number' || typeof chat.type !== 'string') {
    return false;
  }
  if (from !== undefined && (!isObject(from) || typeof from.id !== 'number')) {
    return false;
  }
  if (text !== undefined && typeof text !== 'string') {
    return false;
  }

  return true;
};
