const pidusage = require('pidusage');

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
        this.updateInterval = setInterval(() => this.updateAllResourceUsage(), intervalMs);
    }

    stopMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async updateAllResourceUsage() {
        const processes = this.processManager.getAllProcesses();

        if (processes.size === 0) {
            if (this.resourceUsage.size > 0) {
                this.resourceUsage.clear();
            }
            return [];
        }

        const pids = Array.from(processes.values())
            .map(child => child.pid)
            .filter(Boolean);

        if (pids.length === 0) return [];

        try {
            const stats = await pidusage(pids);
            const usageData = [];

            for (const pid in stats) {
                if (!stats[pid]) continue;

                const botId = this.getBotIdByPid(parseInt(pid, 10));
                if (botId) {
                    const usage = {
                        botId: botId,
                        cpu: parseFloat(stats[pid].cpu.toFixed(1)),
                        memory: parseFloat((stats[pid].memory / 1024 / 1024).toFixed(1)),
                    };
                    this.resourceUsage.set(botId, usage);
                    usageData.push(usage);
                }
            }

            return usageData;
        } catch (error) {
            this.logger.error({ error }, 'Ошибка обновления ресурсов');
            return [];
        }
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
