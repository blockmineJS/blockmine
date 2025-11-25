-- CreateTable
CREATE TABLE "execution_traces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "graphId" INTEGER NOT NULL,
    "botId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventArgs" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "steps" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "execution_traces_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "execution_traces_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "EventGraph" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "execution_traces_botId_graphId_idx" ON "execution_traces"("botId", "graphId");

-- CreateIndex
CREATE INDEX "execution_traces_createdAt_idx" ON "execution_traces"("createdAt");
