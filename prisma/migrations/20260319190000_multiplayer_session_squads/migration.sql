-- CreateEnum
CREATE TYPE "MultiplayerTeamSide" AS ENUM ('HOME', 'AWAY');

-- CreateEnum
CREATE TYPE "MultiplayerParticipantKind" AS ENUM ('HUMAN', 'BOT');

-- CreateEnum
CREATE TYPE "MultiplayerSquadRole" AS ENUM ('STARTER', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "MultiplayerSessionStatus" AS ENUM ('WAITING_FOR_PLAYERS', 'READY_FOR_FALLBACK', 'READY_TO_PREPARE', 'PREPARING_MATCH', 'CLOSED');

-- CreateEnum
CREATE TYPE "MultiplayerSessionFillPolicy" AS ENUM ('HUMAN_ONLY', 'HUMAN_PRIORITY_WITH_BOT_FALLBACK');

-- CreateTable
CREATE TABLE "MultiplayerSession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "fillPolicy" "MultiplayerSessionFillPolicy" NOT NULL,
    "maxStartersPerSide" INTEGER NOT NULL,
    "maxSubstitutesPerSide" INTEGER NOT NULL,
    "botFallbackEligibleSlots" INTEGER NOT NULL,
    "minimumHumansToStart" INTEGER,
    "linkedMatchId" TEXT,
    "status" "MultiplayerSessionStatus" NOT NULL DEFAULT 'WAITING_FOR_PLAYERS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MultiplayerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MultiplayerSessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "side" "MultiplayerTeamSide" NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "squadRole" "MultiplayerSquadRole" NOT NULL,
    "kind" "MultiplayerParticipantKind" NOT NULL,
    "userId" TEXT,
    "playerId" TEXT,
    "playerName" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MultiplayerSessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MultiplayerSession_code_key" ON "MultiplayerSession"("code");

-- CreateIndex
CREATE INDEX "MultiplayerSession_hostUserId_status_createdAt_idx" ON "MultiplayerSession"("hostUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MultiplayerSession_linkedMatchId_idx" ON "MultiplayerSession"("linkedMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "MultiplayerSessionParticipant_sessionId_side_squadRole_slotN_key" ON "MultiplayerSessionParticipant"("sessionId", "side", "squadRole", "slotNumber");

-- CreateIndex
CREATE INDEX "MultiplayerSessionParticipant_sessionId_side_squadRole_idx" ON "MultiplayerSessionParticipant"("sessionId", "side", "squadRole");

-- CreateIndex
CREATE INDEX "MultiplayerSessionParticipant_userId_idx" ON "MultiplayerSessionParticipant"("userId");

-- CreateIndex
CREATE INDEX "MultiplayerSessionParticipant_playerId_idx" ON "MultiplayerSessionParticipant"("playerId");

-- AddForeignKey
ALTER TABLE "MultiplayerSession" ADD CONSTRAINT "MultiplayerSession_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiplayerSession" ADD CONSTRAINT "MultiplayerSession_linkedMatchId_fkey" FOREIGN KEY ("linkedMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiplayerSessionParticipant" ADD CONSTRAINT "MultiplayerSessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MultiplayerSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiplayerSessionParticipant" ADD CONSTRAINT "MultiplayerSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiplayerSessionParticipant" ADD CONSTRAINT "MultiplayerSessionParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
