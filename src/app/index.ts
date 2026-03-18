import { buildContainer } from './container';
import { loadEnv } from '../config/env';

export const bootstrap = () => {
  const env = loadEnv();
  const container = buildContainer();

  return {
    env,
    container
  };
};

if (require.main === module) {
  const { env } = bootstrap();
  // Nesta fase o bootstrap valida a configuração e deixa o app pronto para plugar um runtime Telegram.
  console.log(`TeleSoccer Fase 1 carregado em modo ${env.NODE_ENV}.`);
}
