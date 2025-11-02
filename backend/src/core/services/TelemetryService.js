const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TelemetryService {
    constructor({ config, botProcessManager, logger }) {
        this.config = config;
        this.processManager = botProcessManager;
        this.logger = logger;
        this.instanceId = null;
        this.heartbeatDebounceTimer = null;
        this.heartbeatInterval = null;

        this.STATS_SERVER_URL = 'http://185.65.200.184:3000';
        this.DATA_DIR = path.join(os.homedir(), '.blockmine');
        this.INSTANCE_ID_PATH = path.join(this.DATA_DIR, '.instance_id');

        this.loadInstanceId();
    }

    loadInstanceId() {
        if (this.instanceId) return this.instanceId;

        try {
            if (fs.existsSync(this.INSTANCE_ID_PATH)) {
                this.instanceId = fs.readFileSync(this.INSTANCE_ID_PATH, 'utf-8');
            } else {
                this.instanceId = uuidv4();
                if (!fs.existsSync(this.DATA_DIR)) {
                    fs.mkdirSync(this.DATA_DIR, { recursive: true });
                }
                fs.writeFileSync(this.INSTANCE_ID_PATH, this.instanceId, 'utf-8');
            }
        } catch (error) {
            this.logger.error({ error }, 'Ошибка загрузки Instance ID');
            return null;
        }

        return this.instanceId;
    }

    getInstanceId() {
        return this.instanceId;
    }

    startHeartbeat(intervalMs = 5 * 60 * 1000) {
        if (!this.config.telemetry?.enabled) return;

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), intervalMs);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    triggerHeartbeat() {
        if (!this.config.telemetry?.enabled) return;

        if (this.heartbeatDebounceTimer) {
            clearTimeout(this.heartbeatDebounceTimer);
        }

        this.heartbeatDebounceTimer = setTimeout(() => {
            this.sendHeartbeat();
        }, 3000);
    }

    async sendHeartbeat() {
        if (!this.config.telemetry?.enabled || !this.instanceId) return;

        try {
            const processes = this.processManager.getAllProcesses();
            const runningBots = Array.from(processes.values())
                .filter(p => p.botConfig)
                .map(p => ({
                    username: p.botConfig.username,
                    serverHost: p.botConfig.server.host,
                    serverPort: p.botConfig.server.port
                }));

            if (runningBots.length === 0) return;

            const challengeRes = await fetch(`${this.STATS_SERVER_URL}/api/challenge?uuid=${this.instanceId}`);
            if (!challengeRes.ok) throw new Error(`Challenge server error: ${challengeRes.statusText}`);

            const { challenge, difficulty, prefix } = await challengeRes.json();

            // Proof of work
            let nonce = 0;
            let hash = '';
            do {
                nonce++;
                hash = crypto.createHash('sha256').update(prefix + challenge + nonce).digest('hex');
            } while (!hash.startsWith('0'.repeat(difficulty)));

            const packageJson = require('../../../../package.json');
            await fetch(`${this.STATS_SERVER_URL}/api/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceUuid: this.instanceId,
                    appVersion: packageJson.version,
                    bots: runningBots,
                    nonce: nonce
                })
            });

            this.logger.debug('Heartbeat отправлен успешно');
        } catch (error) {
            this.logger.error({ error }, 'Не удалось отправить heartbeat');
        }
    }
}

module.exports = TelemetryService;
