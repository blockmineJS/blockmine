class ResourceMonitorService {
    constructor({ botProcessManager, logger }) {
        this.processManager = botProcessManager;
        this.logger = logger;
        this.resourceUsage = new Map();
        this.updateInterval = null;
    }

    startMonitoring(intervalMs = 5000) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = setInterval(() => this.pruneStaleEntries(), intervalMs);
        this.updateInterval.unref?.();
    }

    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    pruneStaleEntries() {
        const processes = this.processManager.getAllProcesses();
        if (processes.size === 0) {
            if (this.resourceUsage.size > 0) {
                this.resourceUsage.clear();
            }
            return;
        }
        const aliveBotIds = new Set(processes.keys());
        for (const botId of Array.from(this.resourceUsage.keys())) {
            if (!aliveBotIds.has(botId)) {
                this.resourceUsage.delete(botId);
            }
        }
    }

    updateFromIPC(botId, { cpu, memory }) {
        if (botId == null) return;
        const usage = {
            botId,
            cpu: parseFloat(Number(cpu).toFixed(1)),
            memory: parseFloat(Number(memory).toFixed(1)),
        };
        this.resourceUsage.set(botId, usage);
        return usage;
    }

    async updateAllResourceUsage() {
        this.pruneStaleEntries();
        return this.getAllResourceUsage();
    }

    getBotIdByPid(pid) {
        const processes = this.processManager.getAllProcesses();
        for (const [botId, child] of processes.entries()) {
            if (child.pid === pid) {
                return botId;
            }
        }
        return null;
    }

    getResourceUsage(botId) {
        return this.resourceUsage.get(botId);
    }

    getAllResourceUsage() {
        return Array.from(this.resourceUsage.values());
    }

    clearResourceUsage(botId) {
        this.resourceUsage.delete(botId);
    }
}

module.exports = ResourceMonitorService;
