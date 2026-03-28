-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TeamSide" AS ENUM ('HOME', 'AWAY');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "TurnResolutionMode" AS ENUM ('AUTO', 'REQUIRES_PLAYER_ACTION');

-- CreateEnum
CREATE TYPE "FrameType" AS ENUM ('TACTICAL_MAP', 'DUEL_SCENE', 'SHOT_SCENE', 'SAVE_SCENE', 'GOAL_SCENE');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('PASS_RECEIVED', 'PASS_INTERCEPTED', 'DRIBBLE', 'DEFENSIVE_DUEL', 'SHOT', 'GOALKEEPER_SAVE', 'GOAL', 'REBOUND', 'CORNER_KICK', 'PENALTY_KICK', 'FALLBACK_MAP');

-- CreateEnum
CREATE TYPE "MatchLineupRole" AS ENUM ('STARTER', 'BENCH');

-- CreateEnum
CREATE TYPE "LineupControlMode" AS ENUM ('HUMAN', 'BOT');

-- CreateEnum
CREATE TYPE "ParticipantActionStatus" AS ENUM ('PENDING', 'APPLIED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shirtNumber" INTEGER,
    "isGoalkeeper" BOOLEAN NOT NULL DEFAULT false,
    "pass" INTEGER NOT NULL,
    "dribble" INTEGER NOT NULL,
    "finishing" INTEGER NOT NULL,
    "marking" INTEGER NOT NULL,
    "tackling" INTEGER NOT NULL,
    "positioning" INTEGER NOT NULL,
    "reflex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "minute" INTEGER NOT NULL DEFAULT 1,
    "possessionTeamSide" "TeamSide" NOT NULL DEFAULT 'HOME',
    "turnNumber" INTEGER NOT NULL DEFAULT 1,
    "turnResolutionMode" "TurnResolutionMode" NOT NULL DEFAULT 'REQUIRES_PLAYER_ACTION',
    "attackingSide" "TeamSide" NOT NULL DEFAULT 'HOME',
    "defendingSide" "TeamSide" NOT NULL DEFAULT 'AWAY',
    "tacticalContext" JSONB NOT NULL,
    "currentEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchTurn" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "possessionTeamSide" "TeamSide" NOT NULL,
    "turnResolutionMode" "TurnResolutionMode" NOT NULL,
    "eventId" TEXT,
    "tacticalContext" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "eventType" "MatchEventType" NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "primaryPlayerId" TEXT,
    "secondaryPlayerId" TEXT,
    "sceneKey" TEXT NOT NULL,
    "frameType" "FrameType" NOT NULL,
    "narrativeText" TEXT NOT NULL,
    "visualPayload" JSONB NOT NULL,
    "success" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchLineup" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "role" "MatchLineupRole" NOT NULL DEFAULT 'STARTER',
    "position" TEXT NOT NULL,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "controlMode" "LineupControlMode" NOT NULL DEFAULT 'BOT',
    "controllerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchLineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchParticipantAction" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT,
    "eventId" TEXT,
    "actionIntent" TEXT NOT NULL,
    "status" "ParticipantActionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipantAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Match_currentEventId_key" ON "Match"("currentEventId");

-- CreateIndex
CREATE INDEX "MatchTurn_matchId_minute_idx" ON "MatchTurn"("matchId", "minute");

-- CreateIndex
CREATE UNIQUE INDEX "MatchTurn_matchId_turnNumber_key" ON "MatchTurn"("matchId", "turnNumber");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_turnNumber_idx" ON "MatchEvent"("matchId", "turnNumber");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_minute_idx" ON "MatchEvent"("matchId", "minute");

-- CreateIndex
CREATE INDEX "MatchLineup_matchId_teamId_controlMode_idx" ON "MatchLineup"("matchId", "teamId", "controlMode");

-- CreateIndex
CREATE INDEX "MatchLineup_matchId_controllerUserId_idx" ON "MatchLineup"("matchId", "controllerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineup_matchId_teamId_slotNumber_key" ON "MatchLineup"("matchId", "teamId", "slotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineup_matchId_teamId_playerId_key" ON "MatchLineup"("matchId", "teamId", "playerId");

-- CreateIndex
CREATE INDEX "MatchParticipantAction_matchId_turnNumber_idx" ON "MatchParticipantAction"("matchId", "turnNumber");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_currentEventId_fkey" FOREIGN KEY ("currentEventId") REFERENCES "MatchEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTurn" ADD CONSTRAINT "MatchTurn_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTurn" ADD CONSTRAINT "MatchTurn_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MatchEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_primaryPlayerId_fkey" FOREIGN KEY ("primaryPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_secondaryPlayerId_fkey" FOREIGN KEY ("secondaryPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineup" ADD CONSTRAINT "MatchLineup_controllerUserId_fkey" FOREIGN KEY ("controllerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipantAction" ADD CONSTRAINT "MatchParticipantAction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipantAction" ADD CONSTRAINT "MatchParticipantAction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipantAction" ADD CONSTRAINT "MatchParticipantAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchParticipantAction" ADD CONSTRAINT "MatchParticipantAction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MatchEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

