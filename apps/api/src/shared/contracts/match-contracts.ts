export interface MatchStateView {
  matchId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'FINISHED';
  minute: number;
  homeScore: number;
  awayScore: number;
  possession: 'HOME' | 'AWAY';
  sceneText: string;
}
