-- CreateTable
CREATE TABLE "Server" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 25565,
    "version" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Bot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "prefix" TEXT DEFAULT '@',
    "note" TEXT,
    "serverId" INTEGER NOT NULL,
    "proxyHost" TEXT,
    "proxyPort" INTEGER,
    "proxyUsername" TEXT,
    "proxyPassword" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "owners" TEXT DEFAULT '',
    CONSTRAINT "Bot_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstalledPlugin" (
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

-- CreateTable
CREATE TABLE "Command" (
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
    CONSTRAINT "Command_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Command_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventGraph" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "botId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "graphJson" TEXT DEFAULT 'null',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "variables" TEXT DEFAULT '[]',
    CONSTRAINT "EventGraph_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventTrigger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "graphId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    CONSTRAINT "EventTrigger_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "EventGraph" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "botId" INTEGER NOT NULL,
    CONSTRAINT "User_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL DEFAULT 'system',
    "botId" INTEGER NOT NULL,
    CONSTRAINT "Group_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT NOT NULL DEFAULT 'system',
    "botId" INTEGER NOT NULL,
    CONSTRAINT "Permission_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,

    PRIMARY KEY ("userId", "groupId"),
    CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupPermission" (
    "groupId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    PRIMARY KEY ("groupId", "permissionId"),
    CONSTRAINT "GroupPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
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

-- CreateTable
CREATE TABLE "PanelUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PanelUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "PanelRole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PanelRole" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '[]'
);

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
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Bot_username_key" ON "Bot"("username");

-- CreateIndex
CREATE UNIQUE INDEX "InstalledPlugin_botId_name_key" ON "InstalledPlugin"("botId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Command_botId_name_key" ON "Command"("botId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EventGraph_botId_name_key" ON "EventGraph"("botId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EventTrigger_graphId_eventType_key" ON "EventTrigger"("graphId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "User_botId_username_key" ON "User"("botId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Group_botId_name_key" ON "Group"("botId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_botId_name_key" ON "Permission"("botId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PanelUser_uuid_key" ON "PanelUser"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "PanelUser_username_key" ON "PanelUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "PanelRole_name_key" ON "PanelRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PluginDataStore_pluginName_botId_key_key" ON "PluginDataStore"("pluginName", "botId", "key");

