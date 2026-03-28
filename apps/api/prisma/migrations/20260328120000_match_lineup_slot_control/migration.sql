-- CreateEnum
CREATE TYPE "LineupControlMode" AS ENUM ('HUMAN', 'BOT');

-- AlterTable
ALTER TABLE "MatchLineup"
ADD COLUMN "slotNumber" INTEGER,
ADD COLUMN "controlMode" "LineupControlMode" NOT NULL DEFAULT 'BOT',
ADD COLUMN "controllerUserId" TEXT;

-- Backfill slotNumber for existing rows (if any)
WITH ranked_slots AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "matchId", "teamId"
      ORDER BY "createdAt", id
    ) AS slot_number
  FROM "MatchLineup"
)
UPDATE "MatchLineup" ml
SET "slotNumber" = rs.slot_number
FROM ranked_slots rs
WHERE ml.id = rs.id;

ALTER TABLE "MatchLineup"
ALTER COLUMN "slotNumber" SET NOT NULL;

-- CreateIndex
CREATE INDEX "MatchLineup_matchId_teamId_controlMode_idx" ON "MatchLineup"("matchId", "teamId", "controlMode");

-- CreateIndex
CREATE INDEX "MatchLineup_matchId_controllerUserId_idx" ON "MatchLineup"("matchId", "controllerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineup_matchId_teamId_slotNumber_key" ON "MatchLineup"("matchId", "teamId", "slotNumber");

-- AddForeignKey
ALTER TABLE "MatchLineup"
ADD CONSTRAINT "MatchLineup_controllerUserId_fkey"
FOREIGN KEY ("controllerUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
