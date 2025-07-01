/*
  Warnings:

  - You are about to drop the column `eventType` on the `EventGraph` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "EventTrigger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "graphId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    CONSTRAINT "EventTrigger_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "EventGraph" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventGraph" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "graphJson" TEXT DEFAULT 'null',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventGraph_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EventGraph" ("botId", "createdAt", "graphJson", "id", "isEnabled", "name", "updatedAt") SELECT "botId", "createdAt", "graphJson", "id", "isEnabled", "name", "updatedAt" FROM "EventGraph";
DROP TABLE "EventGraph";
ALTER TABLE "new_EventGraph" RENAME TO "EventGraph";
CREATE UNIQUE INDEX "EventGraph_botId_name_key" ON "EventGraph"("botId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EventTrigger_graphId_eventType_key" ON "EventTrigger"("graphId", "eventType");
