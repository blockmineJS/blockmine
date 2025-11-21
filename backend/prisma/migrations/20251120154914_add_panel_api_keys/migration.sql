-- CreateTable
CREATE TABLE "PanelApiKey" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "customScopes" TEXT,
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PanelApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PanelUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PanelApiKey_userId_idx" ON "PanelApiKey"("userId");

-- CreateIndex
CREATE INDEX "PanelApiKey_keyHash_idx" ON "PanelApiKey"("keyHash");
