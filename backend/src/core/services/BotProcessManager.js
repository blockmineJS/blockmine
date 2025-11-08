const { fork } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class BotProcessManager {
    constructor({ logger }) {
        this.logger = logger;
        this.processes = new Map(); // botId -> child process
        this.pendingPlayerListRequests = new Map();
        this.pendingCommandRequests = new Map();
        this.uiSubscriptions = new Map(); // botId -> Map<pluginName -> Set<socket>>
    }

    isRunning(botId) {
        const child = this.processes.get(botId);
        return !!(child && !child.killed);
    }

    getProcess(botId) {
        return this.processes.get(botId);
    }

    getAllProcesses() {
        return this.processes;
    }

    async spawn(botConfig, fullBotConfig) {
        const botProcessPath = path.resolve(__dirname, '../BotProcess.js');
        const child = fork(botProcessPath, [], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {
                ...process.env,
                NODE_PATH: path.resolve(__dirname, '../../../node_modules')
            }
        });

        child.botConfig = botConfig;
        this.processes.set(botConfig.id, child);

        return child;
    }

    sendMessage(botId, message) {
        const child = this.processes.get(botId);
        if (child && !child.killed) {
            child.send(message);
            return true;
        }
        return false;
    }

    kill(botId, signal = 'SIGTERM') {
        const child = this.processes.get(botId);
        if (child && !child.killed) {
            child.kill(signal);
            return true;
        }
        return false;
    }

    remove(botId) {
        this.processes.delete(botId);
    }

    // Plugin UI subscriptions
    subscribeToPluginUi(botId, pluginName, socket) {
        if (!this.uiSubscriptions.has(botId)) {
            this.uiSubscriptions.set(botId, new Map());
        }
        const botSubscriptions = this.uiSubscriptions.get(botId);

        if (!botSubscriptions.has(pluginName)) {
            botSubscriptions.set(pluginName, new Set());
        }
        const pluginSubscribers = botSubscriptions.get(pluginName);

        pluginSubscribers.add(socket);
        this.logger.info(`Socket ${socket.id} подписался на ${pluginName} для бота ${botId}. Всего: ${pluginSubscribers.size}`);

        this.sendMessage(botId, { type: 'plugin:ui:start-updates', pluginName });
    }

    unsubscribeFromPluginUi(botId, pluginName, socket) {
        const botSubscriptions = this.uiSubscriptions.get(botId);
        if (!botSubscriptions) return;

        const pluginSubscribers = botSubscriptions.get(pluginName);
        if (!pluginSubscribers) return;

        pluginSubscribers.delete(socket);
        this.logger.info(`Socket ${socket.id} отписался от ${pluginName} для бота ${botId}. Осталось: ${pluginSubscribers.size}`);

        if (pluginSubscribers.size === 0) {
            this.sendMessage(botId, { type: 'plugin:ui:stop-updates', pluginName });
            botSubscriptions.delete(pluginName);
        }
    }

    handleSocketDisconnect(socket) {
        this.uiSubscriptions.forEach((botSubscriptions, botId) => {
            botSubscriptions.forEach((pluginSubscribers, pluginName) => {
                if (pluginSubscribers.has(socket)) {
                    this.unsubscribeFromPluginUi(botId, pluginName, socket);
                }
            });
        });
    }

    getPluginSubscribers(botId, pluginName) {
        return this.uiSubscriptions.get(botId)?.get(pluginName);
    }

    // Pending requests
    addPlayerListRequest(requestId, handler) {
        this.pendingPlayerListRequests.set(requestId, handler);
    }

    resolvePlayerListRequest(requestId, players) {
        const request = this.pendingPlayerListRequests.get(requestId);
        if (request) {
            clearTimeout(request.timeout);
            request.resolve(players);
            this.pendingPlayerListRequests.delete(requestId);
        }
    }

    addNearbyEntitiesRequest(requestId, handler) {
        if (!this.pendingNearbyEntitiesRequests) {
            this.pendingNearbyEntitiesRequests = new Map();
        }
        this.pendingNearbyEntitiesRequests.set(requestId, handler);
    }

    resolveNearbyEntitiesRequest(requestId, entities) {
        if (!this.pendingNearbyEntitiesRequests) {
            this.pendingNearbyEntitiesRequests = new Map();
        }
        const request = this.pendingNearbyEntitiesRequests.get(requestId);
        if (request) {
            clearTimeout(request.timeout);
            request.resolve(entities);
            this.pendingNearbyEntitiesRequests.delete(requestId);
        }
    }

    addCommandRequest(requestId, handler) {
        this.pendingCommandRequests.set(requestId, handler);
    }

    resolveCommandRequest(requestId, result, error) {
        const request = this.pendingCommandRequests.get(requestId);
        if (request) {
            if (error) {
                request.reject(new Error(error));
            } else {
                request.resolve(result);
            }
            this.pendingCommandRequests.delete(requestId);
        }
    }
}

module.exports = BotProcessManager;
