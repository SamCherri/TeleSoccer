/**
 * Repositório Prisma preparado para produção.
 * Nesta estrutura básica, o runtime padrão utiliza memória.
 */
export class PrismaPlayerRepository {
  constructor(prismaClient) {
    this.prismaClient = prismaClient;
  }

  async create(input) {
    return this.prismaClient.player.create({ data: input });
  }

  async findByTelegramUserId(telegramUserId) {
    return this.prismaClient.player.findUnique({ where: { telegramUserId } });
  }

  async list() {
    return this.prismaClient.player.findMany({ orderBy: { createdAt: "asc" } });
  }
}
