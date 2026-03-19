export enum MatchStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Finished = 'FINISHED'
}

export enum MatchHalf {
  First = 'FIRST_HALF',
  Second = 'SECOND_HALF',
  Extra = 'EXTRA_TIME',
  Penalties = 'PENALTIES'
}

export enum MatchTurnState {
  Pending = 'PENDING',
  Resolved = 'RESOLVED',
  TimedOut = 'TIMED_OUT'
}

export enum MatchPossessionSide {
  Home = 'HOME',
  Away = 'AWAY'
}

export enum MatchRole {
  UserPlayer = 'USER_PLAYER',
  Goalkeeper = 'GOALKEEPER',
  CpuSupport = 'CPU_SUPPORT'
}

export enum MatchContextType {
  ReceivedFree = 'RECEIVED_FREE',
  ReceivedPressed = 'RECEIVED_PRESSED',
  BackToGoal = 'BACK_TO_GOAL',
  InBox = 'IN_BOX',
  DefensiveDuel = 'DEFENSIVE_DUEL',
  GoalkeeperSave = 'GOALKEEPER_SAVE',
  PenaltyKick = 'PENALTY_KICK',
  FreeKick = 'FREE_KICK',
  CornerKick = 'CORNER_KICK'
}

export enum MatchActionKey {
  Pass = 'PASS',
  Dribble = 'DRIBBLE',
  Shoot = 'SHOOT',
  Control = 'CONTROL',
  Protect = 'PROTECT',
  Tackle = 'TACKLE',
  Clear = 'CLEAR',
  Save = 'SAVE',
  Punch = 'PUNCH',
  Catch = 'CATCH',
  RushOut = 'RUSH_OUT',
  Rebound = 'REBOUND',
  DistributeHand = 'DISTRIBUTE_HAND',
  DistributeFoot = 'DISTRIBUTE_FOOT',
  AimLowLeft = 'AIM_LOW_LEFT',
  AimLowRight = 'AIM_LOW_RIGHT',
  AimHighLeft = 'AIM_HIGH_LEFT',
  AimHighRight = 'AIM_HIGH_RIGHT'
}

export enum MatchEventType {
  TurnStarted = 'TURN_STARTED',
  ActionResolved = 'ACTION_RESOLVED',
  Timeout = 'TIMEOUT',
  Goal = 'GOAL',
  Foul = 'FOUL',
  PenaltyAwarded = 'PENALTY_AWARDED',
  CornerAwarded = 'CORNER_AWARDED',
  GoalKickAwarded = 'GOAL_KICK_AWARDED',
  ThrowInAwarded = 'THROW_IN_AWARDED',
  YellowCard = 'YELLOW_CARD',
  RedCard = 'RED_CARD',
  Injury = 'INJURY',
  Suspension = 'SUSPENSION',
  MatchFinished = 'MATCH_FINISHED'
}

export interface MatchActionChoice {
  key: MatchActionKey;
  label: string;
}

export interface MatchTurnView {
  id: string;
  matchId: string;
  sequence: number;
  minute: number;
  half: MatchHalf;
  possessionSide: MatchPossessionSide;
  contextType: MatchContextType;
  contextText: string;
  availableActions: MatchActionChoice[];
  deadlineAt: Date;
  state: MatchTurnState;
  isGoalkeeperContext: boolean;
  previousOutcome?: string;
}

export interface MatchScoreboard {
  homeClubName: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  half: MatchHalf;
  status: MatchStatus;
  stoppageMinutes: number;
}

export interface MatchEventView {
  type: MatchEventType;
  minute: number;
  description: string;
  createdAt: Date;
}

export interface InjuryView {
  severity: number;
  matchesRemaining: number;
  description: string;
}

export interface MatchSummary {
  id: string;
  playerId: string;
  status: MatchStatus;
  scoreboard: MatchScoreboard;
  activeTurn?: MatchTurnView;
  recentEvents: MatchEventView[];
  yellowCards: number;
  redCards: number;
  suspensionMatchesRemaining: number;
  energy: number;
  injury?: InjuryView;
}

export interface StartMatchResult {
  match: MatchSummary;
}

export interface ResolveTurnResult {
  match: MatchSummary;
  resolutionText: string;
}
