-- CreateTable
CREATE TABLE "PanelUserBotAccess" (
    "userId" INTEGER NOT NULL,
    "botId" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "botId"),
    CONSTRAINT "PanelUserBotAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PanelUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PanelUserBotAccess_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PanelUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allBots" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PanelUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PanelRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PanelUser" ("createdAt", "id", "passwordHash", "roleId", "username", "uuid") SELECT "createdAt", "id", "passwordHash", "roleId", "username", "uuid" FROM "PanelUser";
DROP TABLE "PanelUser";
ALTER TABLE "new_PanelUser" RENAME TO "PanelUser";
CREATE UNIQUE INDEX "PanelUser_uuid_key" ON "PanelUser"("uuid");
CREATE UNIQUE INDEX "PanelUser_username_key" ON "PanelUser"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
