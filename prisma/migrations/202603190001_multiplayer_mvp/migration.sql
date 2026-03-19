-- CreateEnum
CREATE TYPE "MultiplayerLobbyStatus" AS ENUM ('OPEN', 'READY', 'CLOSED');

-- CreateTable
CREATE TABLE "MultiplayerLobby" (
    "id" TEXT NOT NULL,
    "lobbyCode" TEXT NOT NULL,
    "status" "MultiplayerLobbyStatus" NOT NULL DEFAULT 'OPEN',
    "hostUserId" TEXT NOT NULL,
    "createdByPlayerId" TEXT NOT NULL,
    "readyForMatchAt" TIMESTAMP(3),
    "linkedMatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MultiplayerLobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MultiplayerLobbyParticipant" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MultiplayerLobbyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MultiplayerLobby_lobbyCode_key" ON "MultiplayerLobby"("lobbyCode");
CREATE INDEX "MultiplayerLobby_status_createdAt_idx" ON "MultiplayerLobby"("status", "createdAt");
CREATE UNIQUE INDEX "MultiplayerLobbyParticipant_lobbyId_userId_key" ON "MultiplayerLobbyParticipant"("lobbyId", "userId");
CREATE UNIQUE INDEX "MultiplayerLobbyParticipant_lobbyId_slotNumber_key" ON "MultiplayerLobbyParticipant"("lobbyId", "slotNumber");
CREATE INDEX "MultiplayerLobbyParticipant_userId_joinedAt_idx" ON "MultiplayerLobbyParticipant"("userId", "joinedAt");
CREATE INDEX "MultiplayerLobbyParticipant_playerId_joinedAt_idx" ON "MultiplayerLobbyParticipant"("playerId", "joinedAt");

-- AddForeignKey
ALTER TABLE "MultiplayerLobby" ADD CONSTRAINT "MultiplayerLobby_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MultiplayerLobby" ADD CONSTRAINT "MultiplayerLobby_createdByPlayerId_fkey" FOREIGN KEY ("createdByPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MultiplayerLobby" ADD CONSTRAINT "MultiplayerLobby_linkedMatchId_fkey" FOREIGN KEY ("linkedMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MultiplayerLobbyParticipant" ADD CONSTRAINT "MultiplayerLobbyParticipant_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "MultiplayerLobby"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MultiplayerLobbyParticipant" ADD CONSTRAINT "MultiplayerLobbyParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MultiplayerLobbyParticipant" ADD CONSTRAINT "MultiplayerLobbyParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
