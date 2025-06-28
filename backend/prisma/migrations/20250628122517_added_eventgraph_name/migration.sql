/*
  Warnings:

  - Added the required column `name` to the `EventGraph` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventGraph" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "graphJson" TEXT DEFAULT 'null',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventGraph_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventGraph" ("botId", "createdAt", "eventType", "graphJson", "id", "isEnabled", "updatedAt", "name") SELECT "botId", "createdAt", "eventType", "graphJson", "id", "isEnabled", "updatedAt", "eventType" FROM "EventGraph";
DROP TABLE "EventGraph";
ALTER TABLE "new_EventGraph" RENAME TO "EventGraph";
CREATE UNIQUE INDEX "EventGraph_botId_name_key" ON "EventGraph"("botId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
