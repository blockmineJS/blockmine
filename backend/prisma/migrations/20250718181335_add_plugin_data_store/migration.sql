-- CreateTable
CREATE TABLE "PluginDataStore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pluginName" TEXT NOT NULL,
    "botId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PluginDataStore_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PluginDataStore_pluginName_botId_key_key" ON "PluginDataStore"("pluginName", "botId", "key");
