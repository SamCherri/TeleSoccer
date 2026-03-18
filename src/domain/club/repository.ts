export interface ClubSummary {
  id: string;
  name: string;
  country: string;
  city: string;
  division: string;
  reputation: number;
}

export interface ClubRepository {
  ensureStarterClubs(): Promise<void>;
  findStarterClubForTryout(score: number): Promise<ClubSummary | null>;
}
