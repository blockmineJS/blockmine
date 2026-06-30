const DependencyResolver = require('../domain/services/DependencyResolver');
const { decrypt } = require('../utils/crypto');
const UserService = require('../UserService');
const PermissionManager = require('../PermissionManager');
const CrashRestartManager = require('./CrashRestartManager');
const BotIPCMessageRouter = require('./BotIPCMessageRouter');
const ErrorHandler = require('../errors/ErrorHandler');

const dependencyResolver = new DependencyResolver();
const errorHandler = new ErrorHandler({ logger: console });

class BotLifecycleService {
    constructor({
        botRepository,
        pluginRepository,
        commandRepository,
        permissionRepository,
        botProcessManager,
        cacheManager,
        resourceMonitorService,
        telemetryService,
        eventGraphManager,
        commandExecutionService,
        logger
    }) {
        this.botRepository = botRepository;
        this.pluginRepository = pluginRepository;
        this.commandRepository = commandRepository;
        this.permissionRepository = permissionRepository;
        this.processManager = botProcessManager;
        this.cache = cacheManager;
        this.resourceMonitor = resourceMonitorService;
        this.telemetry = telemetryService;
        this.eventGraphManager = eventGraphManager;
        this.commandExecutionService = commandExecutionService;
        this.logger = logger;

        this.logCache = new Map();
        this.startingBots = new Set();
        this.crashRestartManager = new CrashRestartManager(5, 60000);

        this.ipcRouter = new BotIPCMessageRouter({
            eventGraphManager: this.eventGraphManager,
            commandExecutionService: this.commandExecutionService,
            processManager: this.processManager,
            resourceMonitor: this.resourceMonitor,
            logger: this.logger,
            crashRestartManager: this.crashRestartManager,
            appendLog: this.appendLog.bind(this),
            emitStatusUpdate: this.emitStatusUpdate.bind(this),
            restartBot: this.restartBot.bind(this),
            stopBot: this.stopBot.bind(this),
            getBotConfig: (botId) => this.processManager.getProcess(botId)?.botConfig,
        });
    }

    async startBot(botConfig) {
        const botId = botConfig.id;

        if (this.processManager.isRunning(botId) || this.startingBots.has(botId)) {
            this.appendLog(botId, `[SYSTEM-ERROR] Попытка повторного запуска. Запуск отменен.`);
            return { success: false, message: 'Бот уже запущен или запускается.' };
        }

        this.startingBots.add(botId);
        try {
        await this._syncSystemPermissions(botId);
        await this.loadConfigForBot(botId);
        this.logCache.set(botId, []);
        this.emitStatusUpdate(botId, 'starting', '');

        const allPluginsForBot = await this.pluginRepository.findByBotId(botId);
        const enabledPluginsForBot = allPluginsForBot.filter((p) => p.isEnabled);
        const { sortedPlugins, hasCriticalIssues, pluginInfo } = dependencyResolver.resolve(enabledPluginsForBot, allPluginsForBot);

        if (hasCriticalIssues) {
            this.appendLog(botId, '[DependencyManager] Обнаружены критические проблемы с зависимостями, запуск отменен.');

            const criticalIssueTypes = new Set(['missing_dependency', 'version_mismatch', 'circular_dependency']);

            for (const pluginId in pluginInfo) {
                const info = pluginInfo[pluginId];
                if (info.issues.length === 0) continue;

                const criticalIssues = info.issues.filter(issue => criticalIssueTypes.has(issue.type));

                if (criticalIssues.length > 0) {
                    this.appendLog(botId, `* Плагин "${info.name}":`);
                    for (const issue of criticalIssues) {
                        const msg = issue.message || `${issue.messageKey} ${JSON.stringify(issue.context || {})}`;
                        this.appendLog(botId, `  - ${msg}`);
                    }
                }
            }

            this.emitStatusUpdate(botId, 'stopped', 'Ошибка зависимостей плагинов.');
            return { success: false, message: 'Критические ошибки в зависимостях плагинов.' };
        }

        const decryptedConfig = { ...botConfig };

        if (decryptedConfig.proxy) {
            decryptedConfig.proxyHost = decryptedConfig.proxy.host;
            decryptedConfig.proxyPort = decryptedConfig.proxy.port;
            decryptedConfig.proxyUsername = decryptedConfig.proxy.username;
            decryptedConfig.proxyPassword = decryptedConfig.proxy.password;
        }

        if (decryptedConfig.password) decryptedConfig.password = decrypt(decryptedConfig.password);
        if (decryptedConfig.proxyPassword) decryptedConfig.proxyPassword = decrypt(decryptedConfig.proxyPassword);
        if (decryptedConfig.proxyUsername) decryptedConfig.proxyUsername = decryptedConfig.proxyUsername.trim();

        const fullBotConfig = { ...decryptedConfig, plugins: sortedPlugins };

        const child = await this.processManager.spawn(botConfig, fullBotConfig);

        child.api = {
            sendMessage: (type, message, username) => {
                if (!child.killed) {
                    child.send({ type: 'chat', payload: { message, chatType: type, username } });
                }
            },
            sendLog: (message) => {
                this.appendLog(botId, message);
            }
        };

        this.ipcRouter.attachToChild(child, botConfig);

        child.send({ type: 'start', config: fullBotConfig });

        await this.eventGraphManager.loadGraphsForBot(botId);

        this.telemetry.triggerHeartbeat();
        this.emitStatusUpdate(botId, 'starting');

        return child;
        } finally {
            this.startingBots.delete(botId);
        }
    }

    async stopBot(botId) {
        const child = this.processManager.getProcess(botId);
        if (child) {
            this.eventGraphManager.unloadGraphsForBot(botId);

            const { getTraceCollector } = require('./TraceCollectorService');
            const traceCollector = getTraceCollector();
            traceCollector.clearForBot(botId);

            child.send({ type: 'stop' });

            const killTimer = setTimeout(() => {
                if (!child.killed) {
                    this.logger.warn({ botId }, 'Принудительное завершение процесса');
                    try {
                        child.kill('SIGKILL');
                    } catch (error) {
                        this.logger.error({ botId, error }, 'Ошибка принудительного завершения');
                    }
                }
            }, 5000);
            if (typeof killTimer.unref === 'function') killTimer.unref();
            if (typeof child.once === 'function') child.once('exit', () => clearTimeout(killTimer));

            this.cache.clearBotCache(botId);
            return { success: true };
        }
        return { success: false, message: 'Бот не найден или уже остановлен' };
    }

    getChildProcess(botId) {
        return this.processManager.getProcess(botId);
    }

    async restartBot(botId, providedBotConfig = null) {
        const botConfig = providedBotConfig || this.processManager.getProcess(botId)?.botConfig;
        if (!botConfig) {
            throw new Error('Bot configuration not found');
        }

        await this.stopBot(botId);
        await new Promise(resolve => setTimeout(resolve, 1000));

        return this.startBot(botConfig);
    }

    async loadConfigForBot(botId) {
        this.logger.info({ botId }, 'Загрузка конфигурации');

        try {
            const [commands, permissions] = await Promise.all([
                this.commandRepository.findByBotId(botId),
                this.permissionRepository.findByBotId(botId),
            ]);

            const config = {
                commands: new Map(commands.map(cmd => [cmd.name, cmd])),
                permissionsById: new Map(permissions.map(p => [p.id, p])),
                commandAliases: new Map()
            };

            for (const cmd of commands) {
                const aliases = JSON.parse(cmd.aliases || '[]');
                for (const alias of aliases) {
                    config.commandAliases.set(alias, cmd.name);
                }
            }

            this.cache.setBotConfig(botId, config);
            this.logger.info({ botId }, 'Конфигурация загружена');
            return config;
        } catch (error) {
            this.logger.error({ botId, error }, 'Ошибка загрузки конфигурации');
            const handled = errorHandler.handle(error, { botId });
            throw new Error(`Failed to load/cache bot configuration for botId ${botId}: ${error.message}`);
        }
    }

    invalidateConfigCache(botId) {
        if (this.cache.getBotConfig(botId)) {
            this.cache.deleteBotConfig(botId);
            this.logger.debug({ botId }, 'Кеш конфигурации инвалидирован');
        }
    }

    reloadBotConfigInRealTime(botId) {
        const { getIOSafe } = require('../../real-time/socketHandler');
        this.invalidateConfigCache(botId);

        if (this.processManager.sendMessage(botId, { type: 'config:reload' })) {
            this.logger.info({ botId }, 'Отправлен config:reload');
            getIOSafe().emit('bot:config_reloaded', { botId });
        }
    }

    async _syncSystemPermissions(botId) {
        const systemPermissions = [
            { name: "admin.*", description: "Все права администратора", owner: "system" },
            { name: "admin.cooldown.bypass", description: "Обход кулдауна для админ-команд", owner: "system" },
            { name: "user.*", description: "Все права обычного пользователя", owner: "system" },
            { name: "user.say", description: "Доступ к простым командам", owner: "system" },
            { name: "user.cooldown.bypass", description: "Обход кулдауна для юзер-команд", owner: "system" },
        ];

        this.logger.debug({ botId }, 'Синхронизация системных прав');

        try {
            for (const perm of systemPermissions) {
                const existing = await this.permissionRepository.findByName(botId, perm.name);
                if (existing) {
                    if (existing.description !== perm.description) {
                        await this.permissionRepository.update(existing.id, {
                            description: perm.description
                        });
                    }
                } else {
                    await this.permissionRepository.create({
                        botId,
                        name: perm.name,
                        description: perm.description,
                        owner: perm.owner,
                    });
                }
            }
            this.logger.debug({ botId }, 'Системные права синхронизированы');
        } catch (error) {
            this.logger.error({ botId, error }, 'Ошибка синхронизации системных прав');
        }
    }

    appendLog(botId, logContent) {
        const { getIOSafe } = require('../../real-time/socketHandler');
        const logEntry = {
            id: Date.now() + Math.random(),
            content: logContent,
        };

        const currentLogs = this.logCache.get(botId) || [];
        const newLogs = [...currentLogs.slice(-199), logEntry];
        this.logCache.set(botId, newLogs);

        try {
            getIOSafe().emit('bot:log', { botId, log: logEntry });
        } catch (e) {}
    }

    getBotLogs(botId) {
        return this.logCache.get(botId) || [];
    }

    emitStatusUpdate(botId, status, message = null) {
        const { getIOSafe, broadcastToPanelNamespace } = require('../../real-time/socketHandler');
        if (message) this.appendLog(botId, `[SYSTEM] ${message}`);

        try {
            getIOSafe().emit('bot:status', { botId, status, message });
            broadcastToPanelNamespace(getIOSafe(), 'bots:status', {
                botId,
                status,
                message,
                timestamp: new Date().toISOString()
            });
        } catch (e) {}
    }

    getFullState() {
        const processes = this.processManager.getAllProcesses();
        const statuses = {};
        for (const [id, child] of processes.entries()) {
            statuses[id] = child.killed ? 'stopped' : 'running';
        }

        const logs = {};
        for (const [botId, logArray] of this.logCache.entries()) {
            logs[botId] = logArray;
        }

        return { statuses, logs };
    }

    isBotRunning(botId) {
        return this.processManager.isRunning(botId);
    }

    sendMessageToBot(botId, message, chatType = 'command', username = null) {
        const child = this.processManager.getProcess(botId);
        if (child && child.api) {
            child.api.sendMessage(chatType, message, username);
            return { success: true };
        }
        return { success: false, message: 'Бот не найден или не запущен' };
    }

    lookAt(botId, position) {
        if (this.processManager.sendMessage(botId, { type: 'action', name: 'lookAt', payload: { position } })) {
            return { success: true };
        }
        this.logger.error({ botId }, 'Не удалось выполнить lookAt');
        return { success: false };
    }

    async reloadPlugins(botId) {
        if (this.processManager.sendMessage(botId, { type: 'plugins:reload' })) {
            this.logger.info({ botId }, 'Отправлен plugins:reload');
            const { getIOSafe } = require('../../real-time/socketHandler');
            getIOSafe().emit('bot:plugins_reloaded', { botId });
            return { success: true, message: 'Команда на перезагрузку плагинов отправлена.' };
        }
        return { success: false, message: 'Бот не запущен.' };
    }

    sendServerCommandToBot(botId, command) {
        this.processManager.sendMessage(botId, { type: 'server_command', payload: { command } });
    }

    async getPlayerList(botId) {
        if (!this.processManager.isRunning(botId)) {
            return [];
        }

        const cachedPlayers = this.cache.getPlayerList(botId);
        if (cachedPlayers) {
            return cachedPlayers;
        }

        return new Promise((resolve) => {
            const { v4: uuidv4 } = require('uuid');
            const requestId = uuidv4();

            const timeout = setTimeout(() => {
                resolve([]);
            }, 5000);

            this.processManager.addPlayerListRequest(requestId, {
                resolve: (playerList) => {
                    clearTimeout(timeout);
                    this.cache.setPlayerList(botId, playerList);
                    resolve(playerList);
                },
                timeout
            });

            this.processManager.sendMessage(botId, { type: 'system:get_player_list', requestId });
        });
    }

    async getNearbyEntities(botId, position = null, radius = 32) {
        if (!this.processManager.isRunning(botId)) {
            return [];
        }

        return new Promise((resolve) => {
            const { v4: uuidv4 } = require('uuid');
            const requestId = uuidv4();

            const timeout = setTimeout(() => {
                resolve([]);
            }, 5000);

            this.processManager.addNearbyEntitiesRequest(requestId, {
                resolve: (entities) => {
                    clearTimeout(timeout);
                    resolve(entities);
                },
                timeout
            });

            this.processManager.sendMessage(botId, {
                type: 'system:get_nearby_entities',
                requestId,
                payload: { position, radius }
            });
        });
    }

    invalidateUserCache(botId, username) {
        UserService.clearCache(username, botId);
        this.processManager.sendMessage(botId, { type: 'invalidate_user_cache', username });
        return { success: true };
    }

    invalidateAllUserCache(botId) {
        for (const [cacheKey] of UserService.cache.entries()) {
            if (cacheKey.startsWith(`${botId}:`)) {
                UserService.cache.delete(cacheKey);
            }
        }

        this.logger.info({ botId }, 'Кеш пользователей очищен');
        this.processManager.sendMessage(botId, { type: 'invalidate_all_user_cache' });

        return { success: true };
    }
}

module.exports = BotLifecycleService;