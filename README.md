# TeleSoccer

Reinicialização completa do projeto para evolução limpa do produto: web app mobile-first de futebol por turnos orientado por cenas visuais.

## Princípios de arquitetura

- Backend como única fonte de verdade para regras de jogo.
- Separação rígida de camadas: domínio, aplicação, infraestrutura e apresentação.
- Frontend sem regra de negócio.
- Preparado para PostgreSQL + Prisma + Railway.
- Base pronta para evolução multiplayer por vagas (humano/bot).

## Estrutura

- `apps/api`: API Fastify + Prisma + casos de uso.
- `apps/web`: cliente React mobile-first por cenas.

## Próximas etapas

1. Implementar pipeline canônico de turno no backend.
2. Evoluir contratos de cena e ação entre API e WEB.
3. Conectar persistência real via PostgreSQL no Railway.
