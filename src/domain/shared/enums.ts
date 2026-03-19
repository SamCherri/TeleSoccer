export enum PlayerPosition {
  Goalkeeper = 'GOALKEEPER',
  Defender = 'DEFENDER',
  Midfielder = 'MIDFIELDER',
  Forward = 'FORWARD'
}

export enum DominantFoot {
  Right = 'RIGHT',
  Left = 'LEFT'
}

export enum CareerStatus {
  Youth = 'YOUTH',
  Professional = 'PROFESSIONAL'
}

export enum AttributeKey {
  Reflexes = 'REFLEXES',
  Handling = 'HANDLING',
  Kicking = 'KICKING',
  Positioning = 'POSITIONING',
  Passing = 'PASSING',
  Shooting = 'SHOOTING',
  Dribbling = 'DRIBBLING',
  Speed = 'SPEED',
  Marking = 'MARKING'
}

export enum WalletTransactionType {
  InitialGrant = 'INITIAL_GRANT',
  TrainingCost = 'TRAINING_COST',
  TryoutCost = 'TRYOUT_COST'
}

export enum TryoutStatus {
  Failed = 'FAILED',
  Approved = 'APPROVED'
}

export enum HistoryEntryType {
  PlayerCreated = 'PLAYER_CREATED',
  TrainingCompleted = 'TRAINING_COMPLETED',
  TryoutFailed = 'TRYOUT_FAILED',
  TryoutApproved = 'TRYOUT_APPROVED',
  ProfessionalContractStarted = 'PROFESSIONAL_CONTRACT_STARTED'
}

export enum PlayerCreationStep {
  Name = 'NAME',
  Nationality = 'NATIONALITY',
  Position = 'POSITION',
  DominantFoot = 'DOMINANT_FOOT',
  HeightCm = 'HEIGHT_CM',
  WeightKg = 'WEIGHT_KG',
  SkinTone = 'SKIN_TONE',
  HairStyle = 'HAIR_STYLE',
  Confirmation = 'CONFIRMATION'
}
