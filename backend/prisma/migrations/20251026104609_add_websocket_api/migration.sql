-- CreateTable
CREATE TABLE "BotApiKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT 'ReadWrite',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "BotApiKey_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiConnectionLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiConnectionLog_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "BotApiKey_keyHash_key" ON "BotApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "BotApiKey_botId_idx" ON "BotApiKey"("botId");

-- CreateIndex
CREATE INDEX "ApiConnectionLog_botId_createdAt_idx" ON "ApiConnectionLog"("botId", "createdAt");
