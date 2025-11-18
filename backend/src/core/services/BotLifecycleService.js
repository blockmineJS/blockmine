const DependencyService = require('../DependencyService');
const { decrypt } = require('../utils/crypto');
const UserService = require('../UserService');

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
        this.crashCounters = new Map();
    }

    async startBot(botConfig) {
        const botId = botConfig.id;

        if (this.processManager.isRunning(botId)) {
            this.appendLog(botId, `[SYSTEM-ERROR] Попытка повторного запуска. Запуск отменен.`);
            return { success: false, message: 'Бот уже запущен или запускается.' };
        }

        await this._syncSystemPermissions(botId);
        await this.loadConfigForBot(botId);
        this.logCache.set(botId, []);
        this.emitStatusUpdate(botId, 'starting', '');

        const allPluginsForBot = await this.pluginRepository.findEnabledByBotId(botId);
        const { sortedPlugins, hasCriticalIssues, pluginInfo } = DependencyService.resolveDependencies(allPluginsForBot, allPluginsForBot);

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
                        this.appendLog(botId, `  - ${issue.message}`);
                    }
                }
            }

            this.emitStatusUpdate(botId, 'stopped', 'Ошибка зависимостей плагинов.');
            return { success: false, message: 'Критические ошибки в зависимостях плагинов.' };
        }

        const decryptedConfig = { ...botConfig };
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

        // Регистрируем обработчики сообщений от child process
        this._setupChildProcessHandlers(child, botConfig);

        child.send({ type: 'start', config: fullBotConfig });

        await this.eventGraphManager.loadGraphsForBot(botId);

        this.telemetry.triggerHeartbeat();
        this.emitStatusUpdate(botId, 'starting');

        return child;
    }

    async stopBot(botId) {
        const child = this.processManager.getProcess(botId);
        if (child) {
            this.eventGraphManager.unloadGraphsForBot(botId);

            // Очищаем traces для этого бота
            const { getTraceCollector } = require('./TraceCollectorService');
            const traceCollector = getTraceCollector();
            traceCollector.clearForBot(botId);

            child.send({ type: 'stop' });

            // Принудительное завершение через 5 секунд
            setTimeout(() => {
                if (!child.killed) {
                    this.logger.warn({ botId }, 'Принудительное завершение процесса');
                    try {
                        child.kill('SIGKILL');
                    } catch (error) {
                        this.logger.error({ botId, error }, 'Ошибка принудительного завершения');
                    }
                }
            }, 5000);

            this.cache.clearBotCache(botId);
            return { success: true };
        }
        return { success: false, message: 'Бот не найден или уже остановлен' };
    }

    getChildProcess(botId) {
        return this.processManager.getProcess(botId);
    }

    async restartBot(botId) {
        const botConfig = this.processManager.getProcess(botId)?.botConfig;
        if (!botConfig) {
            throw new Error('Bot configuration not found');
        }

        await this.stopBot(botId);

        // Ждём завершения процесса
        await new Promise(resolve => setTimeout(resolve, 1000));

        return this.startBot(botConfig);
    }

    _setupChildProcessHandlers(child, botConfig) {
        const botId = botConfig.id;

        child.on('message', async (message) => {
            try {
                switch (message.type) {
                    case 'event':
                        await this._handleEventMessage(botId, message);
                        break;
                    case 'plugin:data':
                        this._handlePluginDataMessage(botId, message);
                        break;
                    case 'send_websocket_message':
                        this._handleWebSocketMessage(message);
                        break;
                    case 'log':
                        this.appendLog(botId, message.content);
                        break;
                    case 'status':
                        this.emitStatusUpdate(botId, message.status);
                        break;
                    case 'bot_ready':
                        this._handleBotReady(botId);
                        break;
                    case 'validate_and_run_command':
                        if (this.commandExecutionService) {
                            const botConfig = child.botConfig;
                            if (botConfig) {
                                await this.commandExecutionService.handleCommandValidation(botConfig, message);
                            }
                        }
                        break;
                    case 'request_user_action':
                        await this._handleUserAction(botId, child, message);
                        break;
                    case 'get_player_list_response':
                        this.processManager.resolvePlayerListRequest(message.requestId, message.payload.players);
                        break;
                    case 'get_nearby_entities_response':
                        this.processManager.resolveNearbyEntitiesRequest(message.requestId, message.payload.entities);
                        break;
                    case 'execute_command_response':
                        this.processManager.resolveCommandRequest(message.requestId, message.result, message.error);
                        break;
                    case 'register_command':
                        await this._handleCommandRegistration(botId, message.commandConfig);
                        break;
                    case 'trace:completed':
                        await this._handleTraceCompleted(botId, message.trace);
                        break;
                    case 'debug:check_breakpoint':
                        await this._handleDebugBreakpointCheck(botId, child, message);
                        break;
                    case 'debug:check_step_mode':
                        await this._handleDebugStepModeCheck(botId, child, message);
                        break;
                }
            } catch (error) {
                this.appendLog(botId, `[SYSTEM-ERROR] Критическая ошибка в обработчике: ${error.stack}`);
                this.logger.error({ botId, error }, 'Критическая ошибка в обработчике сообщений');
            }
        });

        child.on('error', (err) => this.appendLog(botId, `[PROCESS FATAL] ${err.stack}`));
        child.stdout.on('data', (data) => console.log(data.toString()));
        child.stderr.on('data', (data) => this.appendLog(botId, `[STDERR] ${data.toString()}`));

        child.on('exit', (code, signal) => {
            this._handleProcessExit(botId, botConfig, code, signal);
        });
    }

    async _handleEventMessage(botId, message) {
        if (message.eventType === 'raw_message') {
            try {
                const { getIO } = require('../../real-time/socketHandler');
                const { broadcastToApiClients } = require('../../real-time/botApi');
                broadcastToApiClients(getIO(), botId, 'chat:raw_message', {
                    raw_message: message.args.rawText || message.args.raw_message,
                    json: message.args.json
                });
            } catch (e) { /* Socket.IO может быть не инициализирован */ }
        }

        if (this.eventGraphManager) {
            this.eventGraphManager.handleEvent(botId, message.eventType, message.args);
        }
    }

    _handlePluginDataMessage(botId, message) {
        const { plugin: pluginName, payload } = message;
        const pluginSubscribers = this.processManager.getPluginSubscribers(botId, pluginName);

        if (pluginSubscribers && pluginSubscribers.size > 0) {
            pluginSubscribers.forEach(socket => {
                socket.emit('plugin:ui:dataUpdate', payload);
            });
        }
    }

    _handleWebSocketMessage(message) {
        const { getIO } = require('../../real-time/socketHandler');
        const { botId, message: msg } = message.payload;
        getIO().to(`bot_${botId}`).emit('bot:message', { message: msg });
    }

    _handleBotReady(botId) {
        this.emitStatusUpdate(botId, 'running', 'Бот успешно подключился к серверу.');
        this.crashCounters.delete(botId);

        try {
            const { getIO } = require('../../real-time/socketHandler');
            const { broadcastBotStatus } = require('../../real-time/botApi');
            broadcastBotStatus(getIO(), botId, true);
        } catch (e) { /* Socket.IO может быть не инициализирован */ }

        // Триггерим событие запуска бота
        if (this.eventGraphManager) {
            this.eventGraphManager.handleEvent(botId, 'botStartup', {});
        }
    }

    async _handleCommandRegistration(botId, commandConfig) {
        if (this.commandExecutionService) {
            await this.commandExecutionService.handleCommandRegistration(botId, commandConfig);
            // this.logger.debug({ botId, commandName: commandConfig.name }, 'Команда зарегистрирована');
        } else {
            this.logger.warn({ botId }, 'CommandExecutionService не доступен для регистрации команды');
        }
    }

    async _handleUserAction(botId, child, message) {
        const { requestId, payload } = message;
        const { targetUsername, action, data } = payload;

        try {
            const botConfig = child.botConfig;
            const user = await UserService.getUser(targetUsername, botId, botConfig);
            if (!user) throw new Error(`Пользователь ${targetUsername} не найден.`);

            let result;

            switch (action) {
                case 'addGroup':
                    result = await user.addGroup(data.group);
                    break;
                case 'removeGroup':
                    result = await user.removeGroup(data.group);
                    break;
                case 'getGroups':
                    result = user.groups ? user.groups.map(g => g.group.name) : [];
                    break;
                case 'getPermissions':
                    result = Array.from(user.permissionsSet);
                    break;
                case 'isBlacklisted':
                    result = user.isBlacklisted;
                    break;
                case 'setBlacklisted':
                    result = await user.setBlacklist(data.value);
                    break;
                default:
                    throw new Error(`Неизвестное действие: ${action}`);
            }

            child.send({ type: 'user_action_response', requestId, payload: result });
        } catch (error) {
            this.logger.error({ botId, action, username: targetUsername, error }, 'Ошибка действия пользователя');
            child.send({ type: 'user_action_response', requestId, error: error.message });
        }
    }

    _handleProcessExit(botId, botConfig, code, signal) {
        this.processManager.remove(botId);
        this.resourceMonitor.clearResourceUsage(botId);
        this.cache.clearBotCache(botId);

        this.emitStatusUpdate(botId, 'stopped', `Процесс завершился с кодом ${code} (сигнал: ${signal || 'none'}).`);

        try {
            const { getIO } = require('../../real-time/socketHandler');
            const { broadcastBotStatus } = require('../../real-time/botApi');
            broadcastBotStatus(getIO(), botId, false);
        } catch (e) { /* Socket.IO может быть не инициализирован */ }

        // Автоперезапуск при критических ошибках
        if (code === 1) {
            this._handleCrashRestart(botId, botConfig);
        }
    }

    _handleCrashRestart(botId, botConfig) {
        const MAX_RESTART_ATTEMPTS = 5;
        const RESTART_COOLDOWN = 60000;

        const counter = this.crashCounters.get(botId) || { count: 0, firstCrash: Date.now() };
        const timeSinceFirstCrash = Date.now() - counter.firstCrash;

        if (timeSinceFirstCrash > RESTART_COOLDOWN) {
            counter.count = 0;
            counter.firstCrash = Date.now();
        }

        counter.count++;
        this.crashCounters.set(botId, counter);

        if (counter.count >= MAX_RESTART_ATTEMPTS) {
            this.logger.warn({ botId, attempts: counter.count }, 'Автоперезапуск остановлен');
            this.appendLog(botId, `[SYSTEM] Обнаружено ${counter.count} критических ошибок подряд.`);
            this.appendLog(botId, `[SYSTEM] Исправьте проблему и запустите бота вручную.`);
            this.crashCounters.delete(botId);
            return;
        }

        this.logger.info({ botId, attempt: counter.count, max: MAX_RESTART_ATTEMPTS }, 'Перезапуск через 5 секунд');
        this.appendLog(botId, `[SYSTEM] Обнаружена критическая ошибка, перезапуск через 5 секунд... (попытка ${counter.count}/${MAX_RESTART_ATTEMPTS})`);

        setTimeout(() => {
            this.logger.info({ botId }, 'Выполняется перезапуск');
            this.startBot(botConfig);
        }, 5000);
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
        const { getIO } = require('../../real-time/socketHandler');
        this.invalidateConfigCache(botId);

        if (this.processManager.sendMessage(botId, { type: 'config:reload' })) {
            this.logger.info({ botId }, 'Отправлен config:reload');
            getIO().emit('bot:config_reloaded', { botId });
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
                    // Обновляем описание если изменилось
                    if (existing.description !== perm.description) {
                        await this.permissionRepository.update(existing.id, {
                            description: perm.description
                        });
                    }
                } else {
                    // Создаем новое системное право
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
        const { getIO } = require('../../real-time/socketHandler');
        const logEntry = {
            id: Date.now() + Math.random(),
            content: logContent,
        };

        const currentLogs = this.logCache.get(botId) || [];
        const newLogs = [...currentLogs.slice(-199), logEntry];
        this.logCache.set(botId, newLogs);

        getIO().emit('bot:log', { botId, log: logEntry });
    }

    getBotLogs(botId) {
        return this.logCache.get(botId) || [];
    }

    emitStatusUpdate(botId, status, message = null) {
        const { getIO } = require('../../real-time/socketHandler');
        if (message) this.appendLog(botId, `[SYSTEM] ${message}`);
        getIO().emit('bot:status', { botId, status, message });
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
            const { getIO } = require('../../real-time/socketHandler');
            getIO().emit('bot:plugins_reloaded', { botId });
            return { success: true, message: 'Команда на перезагрузку плагинов отправлена.' };
        }
        return { success: false, message: 'Бот не запущен.' };
    }

    sendServerCommandToBot(botId, command) {
        this.processManager.sendMessage(botId, { type: 'server_command', payload: { command } });
    }

    async getPlayerList(botId) {
        const PLAYER_LIST_CACHE_TTL = 2000;

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

    async _handleTraceCompleted(botId, trace) {
        try {
            const { getTraceCollector } = require('../services/TraceCollectorService');
            const traceCollector = getTraceCollector();

            // Сохраняем трассировку в главном TraceCollectorService
            await traceCollector._storeCompletedTrace(trace);
        } catch (error) {
            this.logger.error({ botId, error }, 'Ошибка обработки завершённой трассировки');
        }
    }

    async _handleDebugBreakpointCheck(botId, child, message) {
        const { requestId, payload } = message;
        const { graphId, nodeId, nodeType, inputs, executedSteps, context } = payload;

        try {
            const { getGlobalDebugManager } = require('../services/DebugSessionManager');
            const debugManager = getGlobalDebugManager();

            const debugState = debugManager.get(graphId);
            if (!debugState) {
                // Нет debug сессии для этого графа - просто продолжаем выполнение
                child.send({
                    type: 'debug:breakpoint_response',
                    requestId,
                    overrides: null
                });
                return;
            }

            const breakpoint = debugState.breakpoints.get(nodeId);
            if (!breakpoint || !breakpoint.enabled) {
                // Нет брейкпоинта для этой ноды или он отключен
                child.send({
                    type: 'debug:breakpoint_response',
                    requestId,
                    overrides: null
                });
                return;
            }

            // Проверяем условие брейкпоинта (пока всегда срабатывает)
            // TODO: добавить evaluateBreakpointCondition

            breakpoint.hitCount++;

            // Приостанавливаем выполнение и ждём действий от пользователя
            const overrides = await debugState.pause({
                nodeId,
                nodeType,
                inputs,
                executedSteps,
                context,
                breakpoint: {
                    condition: breakpoint.condition,
                    hitCount: breakpoint.hitCount
                }
            });

            // Отправляем результат обратно в дочерний процесс
            child.send({
                type: 'debug:breakpoint_response',
                requestId,
                overrides: overrides || null
            });

        } catch (error) {
            this.logger.error({ botId, error }, 'Ошибка обработки debug breakpoint check');
            // В случае ошибки отправляем null чтобы продолжить выполнение
            child.send({
                type: 'debug:breakpoint_response',
                requestId,
                overrides: null
            });
        }
    }

    async _handleDebugStepModeCheck(botId, child, message) {
        const { requestId, payload } = message;
        const { graphId, nodeId, nodeType, inputs, executedSteps, context } = payload;

        try {
            const { getGlobalDebugManager } = require('../services/DebugSessionManager');
            const debugManager = getGlobalDebugManager();

            const debugState = debugManager.get(graphId);
            if (!debugState) {
                // Нет debug сессии - продолжаем выполнение
                child.send({
                    type: 'debug:breakpoint_response', // Используем тот же тип ответа
                    requestId,
                    overrides: null
                });
                return;
            }

            // Проверяем, нужно ли остановиться в step mode
            if (!debugState.shouldStepPause(nodeId)) {
                // Step mode не активен или не нужно останавливаться на этой ноде
                child.send({
                    type: 'debug:breakpoint_response',
                    requestId,
                    overrides: null
                });
                return;
            }

            // Приостанавливаем выполнение и ждём действий от пользователя
            const overrides = await debugState.pause({
                nodeId,
                nodeType,
                inputs,
                executedSteps,
                context
            });

            // Отправляем результат обратно в дочерний процесс
            child.send({
                type: 'debug:breakpoint_response',
                requestId,
                overrides: overrides || null
            });

        } catch (error) {
            this.logger.error({ botId, error }, 'Ошибка обработки debug step mode check');
            // В случае ошибки отправляем null чтобы продолжить выполнение
            child.send({
                type: 'debug:breakpoint_response',
                requestId,
                overrides: null
            });
        }
    }
}

module.exports = BotLifecycleService;
