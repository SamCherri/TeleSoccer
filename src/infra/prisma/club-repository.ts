import { ClubRepository, ClubSummary } from '../../domain/club/repository';
import { getPrismaClient } from './client';

const starterClubs: Omit<ClubSummary, 'id'>[] = [
  { name: 'Porto Azul FC', country: 'Brasil', city: 'Porto Azul', division: 'Série Regional A', reputation: 60 },
  { name: 'Vale Verde SC', country: 'Brasil', city: 'Vale Verde', division: 'Série Regional A', reputation: 58 },
  { name: 'União do Litoral', country: 'Brasil', city: 'Litoral', division: 'Série Regional B', reputation: 55 }
];

export class PrismaClubRepository implements ClubRepository {
  async ensureStarterClubs(): Promise<void> {
    const prisma = getPrismaClient();

    await prisma.$transaction(
      starterClubs.map((club) =>
        prisma.club.upsert({
          where: { name: club.name },
          create: club,
          update: club
        })
      )
    );
  }

  async findStarterClubForTryout(score: number): Promise<ClubSummary | null> {
    const prisma = getPrismaClient();
    const ordered = await prisma.club.findMany({ orderBy: [{ reputation: 'desc' }, { name: 'asc' }] });
    if (ordered.length === 0) {
      return null;
    }

    const index = score >= 150 ? 0 : score >= 140 ? 1 : ordered.length - 1;
    return ordered[index] ?? ordered[0];
  }
}
