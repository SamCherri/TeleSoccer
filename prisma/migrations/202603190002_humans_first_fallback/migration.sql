-- CreateEnum
CREATE TYPE "MatchParticipantKind" AS ENUM ('HUMAN', 'BOT');
CREATE TYPE "MultiplayerLobbyFillPolicy" AS ENUM ('HUMAN_ONLY', 'HUMAN_PRIORITY_WITH_BOT_FALLBACK');
CREATE TYPE "MultiplayerParticipantKind" AS ENUM ('HUMAN', 'BOT');

-- AlterTable
ALTER TABLE "MatchLineup"
ADD COLUMN "participantKind" "MatchParticipantKind" NOT NULL DEFAULT 'BOT';

ALTER TABLE "MultiplayerLobby"
ADD COLUMN "fillPolicy" "MultiplayerLobbyFillPolicy" NOT NULL DEFAULT 'HUMAN_PRIORITY_WITH_BOT_FALLBACK',
ADD COLUMN "maxParticipants" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "botFallbackEligibleSlots" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "MultiplayerLobbyParticipant"
ADD COLUMN "kind" "MultiplayerParticipantKind" NOT NULL DEFAULT 'HUMAN',
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "playerId" DROP NOT NULL;
