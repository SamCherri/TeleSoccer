-- CreateTable
CREATE TABLE "PlayerCreationConversation" (
    "telegramId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerCreationConversation_pkey" PRIMARY KEY ("telegramId")
);
