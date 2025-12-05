-- AlterTable
ALTER TABLE "PanelUser" ADD COLUMN "lastLoginAt" DATETIME;

-- CreateTable
CREATE TABLE "PanelUserLoginLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PanelUserLoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PanelUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PanelChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PanelChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PanelUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PanelUserLoginLog_userId_createdAt_idx" ON "PanelUserLoginLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PanelUserLoginLog_createdAt_idx" ON "PanelUserLoginLog"("createdAt");

-- CreateIndex
CREATE INDEX "PanelChatMessage_createdAt_idx" ON "PanelChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "PanelChatMessage_userId_idx" ON "PanelChatMessage"("userId");
