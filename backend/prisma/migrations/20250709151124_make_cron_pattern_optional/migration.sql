-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScheduledTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cronPattern" TEXT,
    "action" TEXT NOT NULL,
    "targetBotIds" TEXT NOT NULL,
    "payload" TEXT DEFAULT '{}',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "runOnStartup" BOOLEAN NOT NULL DEFAULT false,
    "lastRun" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ScheduledTask" ("action", "createdAt", "cronPattern", "id", "isEnabled", "lastRun", "name", "payload", "runOnStartup", "targetBotIds", "updatedAt") SELECT "action", "createdAt", "cronPattern", "id", "isEnabled", "lastRun", "name", "payload", "runOnStartup", "targetBotIds", "updatedAt" FROM "ScheduledTask";
DROP TABLE "ScheduledTask";
ALTER TABLE "new_ScheduledTask" RENAME TO "ScheduledTask";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
