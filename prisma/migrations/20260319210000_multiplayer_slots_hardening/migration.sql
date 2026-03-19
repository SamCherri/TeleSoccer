-- CreateTable
CREATE TABLE "MultiplayerSessionSlot" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "side" "MultiplayerTeamSide" NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "squadRole" "MultiplayerSquadRole" NOT NULL,
    "isBotFallbackEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MultiplayerSessionSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MultiplayerSessionSlot_sessionId_side_squadRole_slotNumber_key" ON "MultiplayerSessionSlot"("sessionId", "side", "squadRole", "slotNumber");

-- CreateIndex
CREATE INDEX "MultiplayerSessionSlot_sessionId_side_squadRole_idx" ON "MultiplayerSessionSlot"("sessionId", "side", "squadRole");

-- AddColumn
ALTER TABLE "MultiplayerSessionParticipant" ADD COLUMN "slotId" TEXT;

WITH generated_slots AS (
  SELECT
    md5(random()::text || clock_timestamp()::text || session_data.id || slot_data.side::text || slot_data."squadRole"::text || slot_data."slotNumber"::text) AS id,
    session_data.id AS "sessionId",
    slot_data.side AS side,
    slot_data."squadRole" AS "squadRole",
    slot_data."slotNumber" AS "slotNumber",
    CASE WHEN slot_data.rank <= session_data."botFallbackEligibleSlots" THEN true ELSE false END AS "isBotFallbackEligible"
  FROM "MultiplayerSession" session_data
  CROSS JOIN LATERAL (
    SELECT side, "squadRole", "slotNumber", row_number() OVER (ORDER BY priority, side_order, "slotNumber") AS rank
    FROM (
      SELECT 'AWAY'::"MultiplayerTeamSide" AS side, 'STARTER'::"MultiplayerSquadRole" AS "squadRole", gs AS "slotNumber", 1 AS priority, 1 AS side_order
      FROM generate_series(1, session_data."maxStartersPerSide") gs
      UNION ALL
      SELECT 'HOME'::"MultiplayerTeamSide", 'STARTER'::"MultiplayerSquadRole", gs, 1, 2
      FROM generate_series(1, session_data."maxStartersPerSide") gs
      UNION ALL
      SELECT 'AWAY'::"MultiplayerTeamSide", 'SUBSTITUTE'::"MultiplayerSquadRole", gs, 2, 1
      FROM generate_series(1, session_data."maxSubstitutesPerSide") gs
      UNION ALL
      SELECT 'HOME'::"MultiplayerTeamSide", 'SUBSTITUTE'::"MultiplayerSquadRole", gs, 2, 2
      FROM generate_series(1, session_data."maxSubstitutesPerSide") gs
    ) slot_seed
    WHERE NOT (slot_seed."squadRole" = 'STARTER'::"MultiplayerSquadRole" AND slot_seed."slotNumber" = 1)
      AND NOT EXISTS (
      SELECT 1
      FROM "MultiplayerSessionParticipant" participant_seed
      WHERE participant_seed."sessionId" = session_data.id
        AND participant_seed.side = slot_seed.side
        AND participant_seed."squadRole" = slot_seed."squadRole"
        AND participant_seed."slotNumber" = slot_seed."slotNumber"
        AND participant_seed."isHost" = true
    )
  ) slot_data
)
INSERT INTO "MultiplayerSessionSlot" ("id", "sessionId", "side", "slotNumber", "squadRole", "isBotFallbackEligible")
SELECT id, "sessionId", side, "slotNumber", "squadRole", "isBotFallbackEligible"
FROM generated_slots;

INSERT INTO "MultiplayerSessionSlot" ("id", "sessionId", "side", "slotNumber", "squadRole", "isBotFallbackEligible")
SELECT md5(session.id || participant.side::text || participant."squadRole"::text || participant."slotNumber"::text || participant.id), session.id, participant.side, participant."slotNumber", participant."squadRole", false
FROM "MultiplayerSession" session
JOIN "MultiplayerSessionParticipant" participant ON participant."sessionId" = session.id
LEFT JOIN "MultiplayerSessionSlot" slot
  ON slot."sessionId" = session.id
 AND slot.side = participant.side
 AND slot."squadRole" = participant."squadRole"
 AND slot."slotNumber" = participant."slotNumber"
WHERE slot.id IS NULL;

UPDATE "MultiplayerSessionParticipant" participant
SET "slotId" = slot.id
FROM "MultiplayerSessionSlot" slot
WHERE slot."sessionId" = participant."sessionId"
  AND slot.side = participant.side
  AND slot."squadRole" = participant."squadRole"
  AND slot."slotNumber" = participant."slotNumber";

ALTER TABLE "MultiplayerSessionParticipant" ALTER COLUMN "slotId" SET NOT NULL;
CREATE UNIQUE INDEX "MultiplayerSessionParticipant_slotId_key" ON "MultiplayerSessionParticipant"("slotId");

-- AddForeignKey
ALTER TABLE "MultiplayerSessionSlot" ADD CONSTRAINT "MultiplayerSessionSlot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MultiplayerSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiplayerSessionParticipant" ADD CONSTRAINT "MultiplayerSessionParticipant_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "MultiplayerSessionSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
