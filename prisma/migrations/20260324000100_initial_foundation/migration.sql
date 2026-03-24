CREATE TABLE "Player" (
  "id" TEXT NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "age" INTEGER NOT NULL DEFAULT 14,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Player_telegramUserId_key" ON "Player"("telegramUserId");
