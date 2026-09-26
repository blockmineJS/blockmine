CREATE TABLE "CommandInvocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "commandName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "typeChat" TEXT,
    "argsJson" TEXT NOT NULL DEFAULT '{}',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommandInvocation_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CommandInvocation_botId_createdAt_idx" ON "CommandInvocation"("botId", "createdAt");
CREATE INDEX "CommandInvocation_botId_commandName_createdAt_idx" ON "CommandInvocation"("botId", "commandName", "createdAt");
