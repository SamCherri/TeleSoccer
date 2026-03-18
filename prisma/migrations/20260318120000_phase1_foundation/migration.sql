-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD');
CREATE TYPE "DominantFoot" AS ENUM ('RIGHT', 'LEFT');
CREATE TYPE "CareerStatus" AS ENUM ('YOUTH', 'PROFESSIONAL');
CREATE TYPE "AttributeKey" AS ENUM ('REFLEXES', 'HANDLING', 'KICKING', 'POSITIONING', 'PASSING', 'SHOOTING', 'DRIBBLING', 'SPEED', 'MARKING');
CREATE TYPE "TrainingFocus" AS ENUM ('REFLEXES', 'HANDLING', 'KICKING', 'POSITIONING', 'PASSING', 'SHOOTING', 'DRIBBLING', 'SPEED', 'MARKING');
CREATE TYPE "WalletTransactionType" AS ENUM ('INITIAL_GRANT', 'TRAINING_COST', 'TRYOUT_COST');
CREATE TYPE "TryoutStatus" AS ENUM ('FAILED', 'APPROVED');
CREATE TYPE "HistoryEntryType" AS ENUM ('PLAYER_CREATED', 'TRAINING_COMPLETED', 'TRYOUT_FAILED', 'TRYOUT_APPROVED', 'PROFESSIONAL_CONTRACT_STARTED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "telegramId" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PlayerGeneration" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "generationNumber" INTEGER NOT NULL,
  "inheritedPoints" INTEGER NOT NULL DEFAULT 0,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PlayerGeneration_user_generation_key" UNIQUE ("userId", "generationNumber")
);
CREATE INDEX "PlayerGeneration_user_current_idx" ON "PlayerGeneration"("userId", "isCurrent");
CREATE UNIQUE INDEX "PlayerGeneration_single_current_per_user_idx" ON "PlayerGeneration"("userId") WHERE "isCurrent" = true;

CREATE TABLE "Club" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "country" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "division" TEXT NOT NULL,
  "reputation" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Player" (
  "id" TEXT PRIMARY KEY,
  "generationId" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "nationality" TEXT NOT NULL,
  "position" "PlayerPosition" NOT NULL,
  "dominantFoot" "DominantFoot" NOT NULL,
  "age" INTEGER NOT NULL,
  "heightCm" INTEGER NOT NULL,
  "weightKg" INTEGER NOT NULL,
  "skinTone" TEXT NOT NULL,
  "hairStyle" TEXT NOT NULL,
  "careerStatus" "CareerStatus" NOT NULL DEFAULT 'YOUTH',
  "currentClubId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Player_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "PlayerGeneration"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Player_currentClubId_fkey" FOREIGN KEY ("currentClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Player_currentClubId_idx" ON "Player"("currentClubId");

CREATE TABLE "PlayerAttribute" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "key" "AttributeKey" NOT NULL,
  "value" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerAttribute_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PlayerAttribute_player_key" UNIQUE ("playerId", "key")
);

CREATE TABLE "Wallet" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT NOT NULL UNIQUE,
  "balance" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Wallet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT PRIMARY KEY,
  "walletId" TEXT NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "WalletTransaction_wallet_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

CREATE TABLE "TrainingSession" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "focus" "TrainingFocus" NOT NULL,
  "cost" INTEGER NOT NULL,
  "attributeGain" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TrainingSession_player_week_key" UNIQUE ("playerId", "weekNumber")
);
CREATE INDEX "TrainingSession_player_createdAt_idx" ON "TrainingSession"("playerId", "createdAt");

CREATE TABLE "TryoutAttempt" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "cost" INTEGER NOT NULL,
  "weekNumber" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "requiredScore" INTEGER NOT NULL,
  "status" "TryoutStatus" NOT NULL,
  "clubId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TryoutAttempt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TryoutAttempt_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "TryoutAttempt_player_createdAt_idx" ON "TryoutAttempt"("playerId", "createdAt");
CREATE INDEX "TryoutAttempt_clubId_idx" ON "TryoutAttempt"("clubId");

CREATE TABLE "ClubMembership" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "role" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ClubMembership_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ClubMembership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ClubMembership_player_active_idx" ON "ClubMembership"("playerId", "isActive");
CREATE INDEX "ClubMembership_club_active_idx" ON "ClubMembership"("clubId", "isActive");
CREATE UNIQUE INDEX "ClubMembership_single_active_per_player_idx" ON "ClubMembership"("playerId") WHERE "isActive" = true;

CREATE TABLE "PlayerHistoryEntry" (
  "id" TEXT PRIMARY KEY,
  "playerId" TEXT NOT NULL,
  "type" "HistoryEntryType" NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerHistoryEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PlayerHistoryEntry_player_createdAt_idx" ON "PlayerHistoryEntry"("playerId", "createdAt");
