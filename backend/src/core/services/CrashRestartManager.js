class CrashRestartManager {
    constructor(maxRestarts = 3, restartWindowMs = 60000) {
        this.maxRestarts = maxRestarts;
        this.restartWindowMs = restartWindowMs;
        this.crashHistory = new Map();
    }

    handleCrash(botId, botConfig, appendLog) {
        const history = this.crashHistory.get(botId) || { count: 0, firstCrash: Date.now(), crashes: [] };

        history.count++;
        history.crashes.push(Date.now());

        history.crashes = history.crashes.filter(t => Date.now() - t < this.restartWindowMs);
        history.count = history.crashes.length;
        history.firstCrash = history.crashes[0] || Date.now();

        this.crashHistory.set(botId, history);

        const withinWindow = Date.now() - history.firstCrash < this.restartWindowMs;

        if (history.count > this.maxRestarts && withinWindow) {
            appendLog(`[CRASH] Бот превысил лимит рестартов (${this.maxRestarts}). Авто-рестарт отключен.`);
            return { shouldRestart: false, reason: 'max_restarts_exceeded' };
        }

        const delay = Math.min(1000 * Math.pow(2, history.count - 1), 30000);
        appendLog(`[CRASH] Перезапуск через ${delay / 1000} сек... (попытка ${history.count}/${this.maxRestarts})`);

        return { shouldRestart: true, delay };
    }

    resetCounter(botId) {
        this.crashHistory.delete(botId);
    }

    getCrashCount(botId) {
        return this.crashHistory.get(botId)?.count || 0;
    }
}

module.exports = CrashRestartManager;