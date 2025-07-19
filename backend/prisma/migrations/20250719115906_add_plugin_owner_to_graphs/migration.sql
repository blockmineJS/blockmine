-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Command" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "aliases" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "owner" TEXT,
    "permissionId" INTEGER,
    "allowedChatTypes" TEXT NOT NULL DEFAULT '["chat", "private"]',
    "isVisual" BOOLEAN NOT NULL DEFAULT false,
    "argumentsJson" TEXT DEFAULT '[]',
    "graphJson" TEXT DEFAULT 'null',
    "pluginOwnerId" INTEGER,
    CONSTRAINT "Command_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Command_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Command_pluginOwnerId_fkey" FOREIGN KEY ("pluginOwnerId") REFERENCES "InstalledPlugin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Command" ("aliases", "allowedChatTypes", "argumentsJson", "botId", "cooldown", "description", "graphJson", "id", "isEnabled", "isVisual", "name", "owner", "permissionId") SELECT "aliases", "allowedChatTypes", "argumentsJson", "botId", "cooldown", "description", "graphJson", "id", "isEnabled", "isVisual", "name", "owner", "permissionId" FROM "Command";
DROP TABLE "Command";
ALTER TABLE "new_Command" RENAME TO "Command";
CREATE UNIQUE INDEX "Command_botId_name_key" ON "Command"("botId", "name");
CREATE TABLE "new_EventGraph" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "graphJson" TEXT DEFAULT 'null',
    "variables" TEXT DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "pluginOwnerId" INTEGER,
    CONSTRAINT "EventGraph_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventGraph_pluginOwnerId_fkey" FOREIGN KEY ("pluginOwnerId") REFERENCES "InstalledPlugin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EventGraph" ("botId", "createdAt", "graphJson", "id", "isEnabled", "name", "updatedAt", "variables") SELECT "botId", "createdAt", "graphJson", "id", "isEnabled", "name", "updatedAt", "variables" FROM "EventGraph";
DROP TABLE "EventGraph";
ALTER TABLE "new_EventGraph" RENAME TO "EventGraph";
CREATE UNIQUE INDEX "EventGraph_botId_name_key" ON "EventGraph"("botId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
