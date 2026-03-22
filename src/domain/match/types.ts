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

export type MatchSceneKey =
  | 'pass-received'
  | 'pass-intercepted'
  | 'dribble'
  | 'defensive-duel'
  | 'shot'
  | 'goalkeeper-save'
  | 'goal'
  | 'rebound'
  | 'corner-kick'
  | 'penalty-kick'
  | 'fallback';

export type MatchVisualFramePhase = 'START' | 'DUEL' | 'ACTION' | 'END';
export type MatchVisualPlayerRole = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';
export type MatchFieldZone = 'DEFENSIVE_THIRD' | 'MIDDLE_THIRD' | 'ATTACKING_THIRD' | 'BOX' | 'LEFT_WING' | 'RIGHT_WING' | 'CENTER_CHANNEL';
export type MatchMoveDirection = 'LEFT' | 'RIGHT' | 'FORWARD' | 'BACKWARD' | 'CENTER';
export type MatchVisualOutcome = 'SUCCESS' | 'INTERCEPTED' | 'TACKLED' | 'SAVED' | 'GOAL' | 'FOUL_WON' | 'CLEARED' | 'OUT' | 'TIMEOUT';
export type MatchVisualActionType =
  | 'CONTROL'
  | 'PASS'
  | 'PRESSURE'
  | 'DRIBBLE'
  | 'TACKLE'
  | 'SHOT'
  | 'SAVE'
  | 'CLEAR'
  | 'CORNER'
  | 'PENALTY'
  | 'FREE_KICK'
  | 'REBOUND'
  | 'TIMEOUT';

export interface MatchActionChoice {
  key: MatchActionKey;
  label: string;
}

export interface MatchVisualCoordinate {
  x: number;
  y: number;
}

export interface MatchLineupPlayer {
  id: string;
  side: MatchPossessionSide;
  role: MatchVisualPlayerRole;
  displayName: string;
  shirtNumber: number;
  isUserControlled: boolean;
  tacticalPosition: MatchVisualCoordinate;
}

export interface MatchVisualActorRef {
  lineupId: string;
  playerName: string;
  side: MatchPossessionSide;
  role: MatchVisualPlayerRole;
  shirtNumber: number;
}

export interface MatchVisualEvent {
  sequence: number;
  actionType: MatchVisualActionType;
  sceneKey: MatchSceneKey;
  zone: MatchFieldZone;
  actor: MatchVisualActorRef;
  primaryTarget?: MatchVisualActorRef;
  receiver?: MatchVisualActorRef;
  marker?: MatchVisualActorRef;
  goalkeeper?: MatchVisualActorRef;
  possessionBefore: MatchPossessionSide;
  possessionAfter: MatchPossessionSide;
  origin: MatchVisualCoordinate;
  destination: MatchVisualCoordinate;
  ballTarget: MatchVisualCoordinate;
  movementDirection?: MatchMoveDirection;
  outcome: MatchVisualOutcome;
  headline: string;
  narration: {
    start: string;
    duel?: string;
    action: string;
    end: string;
  };
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
  visualEvent?: MatchVisualEvent;
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

export interface MatchVisualPlayerSnapshot {
  id: string;
  side: MatchPossessionSide;
  role: MatchVisualPlayerRole;
  shirtNumber: number;
  label: string;
  x: number;
  y: number;
  hasBall?: boolean;
  isUserControlled?: boolean;
  isPrimaryActor?: boolean;
  isPrimaryTarget?: boolean;
}

export interface MatchVisualBallSnapshot {
  x: number;
  y: number;
  ownerPlayerId?: string;
  possessionSide: MatchPossessionSide;
}

export interface MatchVisualFrame {
  id: string;
  phase: MatchVisualFramePhase;
  sequence: number;
  minute: number;
  narration: string;
  sceneKey: MatchSceneKey;
  ball: MatchVisualBallSnapshot;
  possessionSide: MatchPossessionSide;
  ownerPlayerId?: string;
  ownerLabel?: string;
  players: MatchVisualPlayerSnapshot[];
}

export interface MatchVisualSequence {
  sequence: number;
  sceneKey: MatchSceneKey;
  headline: string;
  frameCount: number;
  frames: MatchVisualFrame[];
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
  lineups: MatchLineupPlayer[];
  visualSequence?: MatchVisualSequence;
}

export interface StartMatchResult {
  match: MatchSummary;
}

export interface ResolveTurnResult {
  match: MatchSummary;
  resolutionText: string;
}
