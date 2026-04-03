export type MatchStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';

export interface Match {
  id: string;
  status: MatchStatus;
  minute: number;
  homeScore: number;
  awayScore: number;
  sceneText: string;
  possession: 'HOME' | 'AWAY';
}
