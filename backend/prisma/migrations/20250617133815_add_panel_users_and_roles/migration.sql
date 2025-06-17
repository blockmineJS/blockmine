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

-- CreateIndex
CREATE UNIQUE INDEX "PanelUser_uuid_key" ON "PanelUser"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "PanelUser_username_key" ON "PanelUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "PanelRole_name_key" ON "PanelRole"("name");
