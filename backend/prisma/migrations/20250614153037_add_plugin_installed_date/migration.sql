-- AlterTable
ALTER TABLE "Bot" ADD COLUMN "owners" TEXT DEFAULT '';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InstalledPlugin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUri" TEXT,
    "path" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "manifest" TEXT,
    "settings" TEXT DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstalledPlugin_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InstalledPlugin" ("botId", "description", "id", "isEnabled", "manifest", "name", "path", "settings", "sourceType", "sourceUri", "version") SELECT "botId", "description", "id", "isEnabled", "manifest", "name", "path", "settings", "sourceType", "sourceUri", "version" FROM "InstalledPlugin";
DROP TABLE "InstalledPlugin";
ALTER TABLE "new_InstalledPlugin" RENAME TO "InstalledPlugin";
CREATE UNIQUE INDEX "InstalledPlugin_botId_name_key" ON "InstalledPlugin"("botId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
