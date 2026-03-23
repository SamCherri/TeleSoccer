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

export interface TelegramScenePayload {
  key: string;
  title: string;
  hud: string;
  phrase: string;
  svg: string;
  fallbackText: string;
  assetKeys?: string[];
  replacementSlots?: string[];
}

export interface TelegramMediaFile {
  filename: string;
  contentType: string;
  data: string;
}

export interface TelegramSendMessagePayload {
  chat_id: number | string;
  text: string;
  reply_markup?: TelegramReplyKeyboardMarkup;
  scene?: TelegramScenePayload;
}

export interface TelegramSendDocumentPayload {
  chat_id: number | string;
  caption: string;
  document: TelegramMediaFile;
  reply_markup?: TelegramReplyKeyboardMarkup;
  scene: TelegramScenePayload;
}

export type TelegramOutgoingPayload = TelegramSendMessagePayload | TelegramSendDocumentPayload;

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
