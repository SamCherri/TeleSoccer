export interface AppEnv {
  DATABASE_URL: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  APP_BASE_URL?: string;
  PORT: number;
  NODE_ENV: 'development' | 'test' | 'production';
}

export const loadEnv = (): AppEnv => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL é obrigatório para inicializar o TeleSoccer.');
  }

  const nodeEnv = (process.env.NODE_ENV ?? 'development') as AppEnv['NODE_ENV'];
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV inválido. Use development, test ou production.');
  }

  const rawPort = process.env.PORT ?? '3000';
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT deve ser um número inteiro positivo.');
  }

  return {
    DATABASE_URL: databaseUrl,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    APP_BASE_URL: process.env.APP_BASE_URL,
    PORT: port,
    NODE_ENV: nodeEnv
  };
};
