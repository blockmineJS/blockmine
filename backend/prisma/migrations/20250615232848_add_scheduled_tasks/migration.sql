-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "cronPattern" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetBotIds" TEXT NOT NULL,
    "payload" TEXT DEFAULT '{}',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
