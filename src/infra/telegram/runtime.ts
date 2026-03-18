import { Phase1TelegramDispatcher } from '../../bot/phase1-dispatcher';
import { botReplyToTelegramMessage } from './presenter';
import { TelegramHttpClient } from './client';
import { TelegramUpdate } from './types';

export class Phase1TelegramRuntime {
  constructor(
    private readonly dispatcher: Phase1TelegramDispatcher,
    private readonly telegramClient: TelegramHttpClient
  ) {}

  async processUpdate(update: TelegramUpdate): Promise<boolean> {
    const message = update.message;
    if (!message?.from?.id || !message.chat?.id) {
      return false;
    }

    const reply = await this.dispatcher.dispatch({
      telegramId: String(message.from.id),
      text: message.text ?? '/start'
    });

    await this.telegramClient.sendMessage(botReplyToTelegramMessage(message.chat.id, reply));
    return true;
  }
}
