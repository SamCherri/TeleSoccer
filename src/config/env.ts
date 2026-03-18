export interface AppEnv {
  DATABASE_URL: string;
  TELEGRAM_BOT_TOKEN?: string;
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

  return {
    DATABASE_URL: databaseUrl,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    NODE_ENV: nodeEnv
  };
};
