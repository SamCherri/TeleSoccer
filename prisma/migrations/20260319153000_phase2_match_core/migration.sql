-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'FINISHED');
CREATE TYPE "MatchHalf" AS ENUM ('FIRST_HALF', 'SECOND_HALF', 'EXTRA_TIME', 'PENALTIES');
CREATE TYPE "MatchTurnState" AS ENUM ('PENDING', 'RESOLVED', 'TIMED_OUT');
CREATE TYPE "MatchPossessionSide" AS ENUM ('HOME', 'AWAY');
CREATE TYPE "MatchRole" AS ENUM ('USER_PLAYER', 'GOALKEEPER', 'CPU_SUPPORT');
CREATE TYPE "MatchContextType" AS ENUM ('RECEIVED_FREE', 'RECEIVED_PRESSED', 'BACK_TO_GOAL', 'IN_BOX', 'DEFENSIVE_DUEL', 'GOALKEEPER_SAVE', 'PENALTY_KICK', 'FREE_KICK', 'CORNER_KICK');
CREATE TYPE "MatchActionKey" AS ENUM ('PASS', 'DRIBBLE', 'SHOOT', 'CONTROL', 'PROTECT', 'TACKLE', 'CLEAR', 'SAVE', 'PUNCH', 'CATCH', 'RUSH_OUT', 'REBOUND', 'DISTRIBUTE_HAND', 'DISTRIBUTE_FOOT', 'AIM_LOW_LEFT', 'AIM_LOW_RIGHT', 'AIM_HIGH_LEFT', 'AIM_HIGH_RIGHT');
CREATE TYPE "MatchEventType" AS ENUM ('TURN_STARTED', 'ACTION_RESOLVED', 'TIMEOUT', 'GOAL', 'FOUL', 'PENALTY_AWARDED', 'CORNER_AWARDED', 'GOAL_KICK_AWARDED', 'THROW_IN_AWARDED', 'YELLOW_CARD', 'RED_CARD', 'INJURY', 'SUSPENSION', 'MATCH_FINISHED');

ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "Match" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "homeClubId" TEXT NOT NULL,
  "awayClubId" TEXT NOT NULL,
  "homeScore" INTEGER NOT NULL DEFAULT 0,
  "awayScore" INTEGER NOT NULL DEFAULT 0,
  "currentMinute" INTEGER NOT NULL DEFAULT 0,
  "currentHalf" "MatchHalf" NOT NULL DEFAULT 'FIRST_HALF',
  "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
  "possessionSide" "MatchPossessionSide" NOT NULL DEFAULT 'HOME',
  "stoppageMinutes" INTEGER NOT NULL DEFAULT 0,
  "userEnergy" INTEGER NOT NULL DEFAULT 100,
  "yellowCards" INTEGER NOT NULL DEFAULT 0,
  "redCards" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchLineup" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT,
  "side" "MatchPossessionSide" NOT NULL,
  "role" "MatchRole" NOT NULL,
  "displayName" TEXT NOT NULL,
  "shirtNumber" INTEGER,
  "isUserControlled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchTurn" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "minute" INTEGER NOT NULL,
  "half" "MatchHalf" NOT NULL,
  "possessionSide" "MatchPossessionSide" NOT NULL,
  "contextType" "MatchContextType" NOT NULL,
  "contextText" TEXT NOT NULL,
  "availableActions" "MatchActionKey"[],
  "chosenAction" "MatchActionKey",
  "deadlineAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "resolutionText" TEXT,
  "state" "MatchTurnState" NOT NULL DEFAULT 'PENDING',
  "previousOutcome" TEXT,
  "isGoalkeeperContext" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchTurn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchEvent" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "turnId" TEXT,
  "type" "MatchEventType" NOT NULL,
  "minute" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchDisciplinaryEvent" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "type" "MatchEventType" NOT NULL,
  "minute" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "suspensionMatches" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchDisciplinaryEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InjuryRecord" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "matchId" TEXT,
  "description" TEXT NOT NULL,
  "severity" INTEGER NOT NULL,
  "matchesRemaining" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InjuryRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SuspensionRecord" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "matchId" TEXT,
  "reason" TEXT NOT NULL,
  "sourceEventType" "MatchEventType" NOT NULL,
  "matchesRemaining" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SuspensionRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Match_playerId_status_createdAt_idx" ON "Match"("playerId", "status", "createdAt");
CREATE INDEX "MatchLineup_matchId_side_idx" ON "MatchLineup"("matchId", "side");
CREATE UNIQUE INDEX "MatchTurn_matchId_sequence_key" ON "MatchTurn"("matchId", "sequence");
CREATE INDEX "MatchTurn_matchId_state_sequence_idx" ON "MatchTurn"("matchId", "state", "sequence");
CREATE INDEX "MatchEvent_matchId_createdAt_idx" ON "MatchEvent"("matchId", "createdAt");
CREATE INDEX "MatchDisciplinaryEvent_playerId_createdAt_idx" ON "MatchDisciplinaryEvent"("playerId", "createdAt");
CREATE INDEX "MatchDisciplinaryEvent_matchId_createdAt_idx" ON "MatchDisciplinaryEvent"("matchId", "createdAt");
CREATE INDEX "InjuryRecord_playerId_isActive_idx" ON "InjuryRecord"("playerId", "isActive");
CREATE INDEX "SuspensionRecord_playerId_isActive_idx" ON "SuspensionRecord"("playerId", "isActive");

ALTER TABLE "Match" ADD CONSTRAINT "Match_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayClubId_fkey" FOREIGN KEY ("awayClubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchTurn" ADD CONSTRAINT "MatchTurn_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "MatchTurn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MatchDisciplinaryEvent" ADD CONSTRAINT "MatchDisciplinaryEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchDisciplinaryEvent" ADD CONSTRAINT "MatchDisciplinaryEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InjuryRecord" ADD CONSTRAINT "InjuryRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InjuryRecord" ADD CONSTRAINT "InjuryRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SuspensionRecord" ADD CONSTRAINT "SuspensionRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SuspensionRecord" ADD CONSTRAINT "SuspensionRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
