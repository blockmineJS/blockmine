class BotIPCMessageRouter {
    constructor(deps) {
        this.eventGraphManager = deps.eventGraphManager;
        this.commandExecutionService = deps.commandExecutionService;
        this.processManager = deps.processManager;
        this.logger = deps.logger;
        this.crashRestartManager = deps.crashRestartManager;
        this.appendLog = deps.appendLog;
        this.emitStatusUpdate = deps.emitStatusUpdate;
        this.restartBot = deps.restartBot;
        this.getBotConfig = deps.getBotConfig;
    }

    attachToChild(child, botConfig) {
        const botId = botConfig.id;

        child.on('message', async (message) => {
            try {
                await this._routeMessage(botId, child, message);
            } catch (error) {
                this.appendLog(botId, `[SYSTEM-ERROR] Критическая ошибка в обработчике: ${error.stack}`);
                this.logger.error({ botId, error }, 'Критическая ошибка в обработчике сообщений');
            }
        });

        child.on('error', (err) => this.appendLog(botId, `[PROCESS FATAL] ${err.stack}`));
        child.stdout.on('data', (data) => console.log(data.toString()));
        child.stderr.on('data', (data) => this.appendLog(botId, `[STDERR] ${data.toString()}`));

        child.on('exit', (code, signal) => {
            this._handleExit(botId, botConfig, code, signal);
        });
    }

    async _routeMessage(botId, child, message) {
        const handlers = {
            'event': () => this._handleEvent(botId, message),
            'plugin:data': () => this._handlePluginData(botId, message),
            'send_websocket_message': () => this._handleWebSocketMessage(message),
            'log': () => this._handleLog(botId, message),
            'plugin-log': () => this._handlePluginLog(message),
            'status': () => this._handleStatus(botId, message),
            'bot_ready': () => this._handleBotReady(botId),
            'validate_and_run_command': () => this._handleCommandValidation(botId, child, message),
            'request_user_action': () => this._handleUserAction(botId, child, message),
            'get_player_list_response': () => this._handlePlayerListResponse(message),
            'get_nearby_entities_response': () => this._handleNearbyEntitiesResponse(message),
            'execute_command_response': () => this._handleCommandResponse(message),
            'register_command': () => this._handleRegisterCommand(botId, message),
            'register_permissions': () => this._handlePermissions(botId, message),
            'register_group': () => this._handleGroup(botId, message),
            'add_permissions_to_group': () => this._handleAddPermissions(botId, message),
            'trace:completed': () => this._handleTrace(botId, message),
            'debug:check_breakpoint': () => this._handleBreakpoint(botId, child, message),
            'debug:check_step_mode': () => this._handleStepMode(botId, child, message),
            'update_credentials': () => this._handleUpdateCredentials(botId, child, message),
            'restart_bot': () => this._handleRestartBot(botId, child, message),
            'change_credentials': () => this._handleChangeCredentials(botId, child, message),
        };

        const handler = handlers[message.type];
        if (handler) {
            await handler();
        }
    }

    _handleEvent(botId, message) {
        if (message.eventType === 'raw_message') {
            try {
                const { getIOSafe } = require('../../real-time/socketHandler');
                const { broadcastToApiClients } = require('../../real-time/botApi');
                broadcastToApiClients(getIOSafe(), botId, 'chat:raw_message', {
                    raw_message: message.args.rawText || message.args.raw_message,
                    json: message.args.json
                });
            } catch (e) {}
        }

        try {
            const { broadcastToPanelNamespace } = require('../../real-time/panelNamespace');
            broadcastToPanelNamespace(botId, 'bot:event', {
                botId,
                eventType: message.eventType,
                data: message.args || {},
                timestamp: new Date().toISOString()
            });
        } catch (e) {}

        if (this.eventGraphManager) {
            this.eventGraphManager.handleEvent(botId, message.eventType, message.args);
        }
    }

    _handlePluginData(botId, message) {
        const { plugin: pluginName, payload } = message;
        const pluginSubscribers = this.processManager.getPluginSubscribers(botId, pluginName);
        if (pluginSubscribers && pluginSubscribers.size > 0) {
            pluginSubscribers.forEach(socket => socket.emit('plugin:ui:dataUpdate', payload));
        }
    }

    _handlePluginLog(logData) {
        const { getIOSafe, addPluginLogToBuffer } = require('../../real-time/socketHandler');
        const { botId, pluginName } = logData;
        addPluginLogToBuffer(botId, pluginName, logData);
        const io = getIOSafe();
        if (io) {
            io.to(`plugin-logs:${botId}:${pluginName}`).emit('plugin-log', logData);
        }
    }

    _handleWebSocketMessage(message) {
        const { getIOSafe } = require('../../real-time/socketHandler');
        const { botId, message: msg } = message.payload;
        getIOSafe().to(`bot_${botId}`).emit('bot:message', { message: msg });
    }

    _handleLog(botId, message) {
        this.appendLog(botId, message.content);
    }

    _handleStatus(botId, message) {
        this.emitStatusUpdate(botId, message.status);
    }

    _handleBotReady(botId) {
        this.crashRestartManager.resetCounter(botId);
        this.emitStatusUpdate(botId, 'running', 'Бот успешно подключился к серверу.');

        try {
            const { getIOSafe } = require('../../real-time/socketHandler');
            const { broadcastBotStatus } = require('../../real-time/botApi');
            broadcastBotStatus(getIOSafe(), botId, true);
        } catch (e) {}

        if (this.eventGraphManager) {
            this.eventGraphManager.handleEvent(botId, 'botStartup', {});
        }
    }

    async _handleCommandValidation(botId, child, message) {
        if (this.commandExecutionService) {
            const botConfig = child.botConfig;
            if (botConfig) {
                await this.commandExecutionService.handleCommandValidation(botConfig, message);
            }
        }
    }

    async _handleUserAction(botId, child, message) {
        const { requestId, payload } = message;
        const { targetUsername, action, data } = payload;
        const UserService = require('../../core/UserService');
        const PermissionManager = require('../../core/PermissionManager');

        try {
            const botConfig = child.botConfig;
            const user = await UserService.getUser(targetUsername, botId, botConfig);
            if (!user) throw new Error(`Пользователь ${targetUsername} не найден.`);

            let result;
            switch (action) {
                case 'addGroup': result = await user.addGroup(data.group); break;
                case 'removeGroup': result = await user.removeGroup(data.group); break;
                case 'getGroups': result = user.groups ? user.groups.map(g => g.group.name) : []; break;
                case 'getPermissions': result = Array.from(user.permissionsSet); break;
                case 'isBlacklisted': result = user.isBlacklisted; break;
                case 'setBlacklisted': result = await user.setBlacklist(data.value); break;
                default: throw new Error(`Неизвестное действие: ${action}`);
            }

            child.send({ type: 'user_action_response', requestId, payload: result });
        } catch (error) {
            this.logger.error({ botId, action, username: targetUsername, error }, 'Ошибка действия пользователя');
            child.send({ type: 'user_action_response', requestId, error: error.message });
        }
    }

    _handlePlayerListResponse(message) {
        this.processManager.resolvePlayerListRequest(message.requestId, message.payload.players);
    }

    _handleNearbyEntitiesResponse(message) {
        this.processManager.resolveNearbyEntitiesRequest(message.requestId, message.payload.entities);
    }

    _handleCommandResponse(message) {
        this.processManager.resolveCommandRequest(message.requestId, message.result, message.error);
    }

    async _handleRegisterCommand(botId, message) {
        if (this.commandExecutionService) {
            await this.commandExecutionService.handleCommandRegistration(botId, message.commandConfig);
        }
    }

    async _handlePermissions(botId, message) {
        const PermissionManager = require('../../core/PermissionManager');
        await PermissionManager.registerPermissions(botId, message.permissions);
    }

    async _handleGroup(botId, message) {
        const PermissionManager = require('../../core/PermissionManager');
        await PermissionManager.registerGroup(botId, message.groupConfig);
    }

    async _handleAddPermissions(botId, message) {
        const PermissionManager = require('../../core/PermissionManager');
        await PermissionManager.addPermissionsToGroup(botId, message.groupName, message.permissionNames);
    }

    async _handleTrace(botId, message) {
        const { getTraceCollector } = require('./TraceCollectorService');
        await getTraceCollector()._storeCompletedTrace(message.trace);
    }

    async _handleBreakpoint(botId, child, message) {
        const { requestId, payload } = message;
        const { getGlobalDebugManager } = require('./DebugSessionManager');
        const debugManager = getGlobalDebugManager();
        const debugState = debugManager.get(payload.graphId);

        if (!debugState || !debugState.breakpoints.get(payload.nodeId)?.enabled) {
            child.send({ type: 'debug:breakpoint_response', requestId, overrides: null });
            return;
        }

        const bp = debugState.breakpoints.get(payload.nodeId);
        bp.hitCount++;

        const overrides = await debugState.pause({ ...payload, breakpoint: { condition: bp.condition, hitCount: bp.hitCount } });
        child.send({ type: 'debug:breakpoint_response', requestId, overrides: overrides || null });
    }

    async _handleStepMode(botId, child, message) {
        const { requestId, payload } = message;
        const { getGlobalDebugManager } = require('./DebugSessionManager');
        const debugManager = getGlobalDebugManager();
        const debugState = debugManager.get(payload.graphId);

        if (!debugState || !debugState.shouldStepPause(payload.nodeId)) {
            child.send({ type: 'debug:breakpoint_response', requestId, overrides: null });
            return;
        }

        const overrides = await debugState.pause(payload);
        child.send({ type: 'debug:breakpoint_response', requestId, overrides: overrides || null });
    }

    async _handleUpdateCredentials(botId, child, message) {
        const { requestId, payload } = message;
        const { username, password } = payload;
        const { encrypt } = require('../../core/utils/crypto');
        const botRepo = require('../../repositories/BotRepository');

        if (!username?.trim()) {
            child.send({ type: 'credentials_operation_response', requestId, error: 'Empty username' });
            return;
        }

        const data = { username };
        if (password?.trim()) data.password = encrypt(password);

        await botRepo.update(botId, data);

        if (child.botConfig) {
            child.botConfig.username = username;
            if (data.password) child.botConfig.password = data.password;
        }

        this.appendLog(botId, `[API] Credentials обновлены: ${username}`);
        child.send({ type: 'credentials_operation_response', requestId, payload: { success: true } });
    }

    async _handleRestartBot(botId, child, message) {
        const { requestId } = message;
        child.send({ type: 'credentials_operation_response', requestId, payload: { success: true } });

        setTimeout(() => {
            const config = { ...child.botConfig };
            this.restartBot(botId, config);
        }, 3000);
    }

    async _handleChangeCredentials(botId, child, message) {
        const { requestId, payload } = message;
        const { username, password } = payload;
        const { encrypt } = require('../../core/utils/crypto');
        const botRepo = require('../../repositories/BotRepository');

        if (!username?.trim()) {
            child.send({ type: 'credentials_operation_response', requestId, error: 'Empty username' });
            return;
        }

        const data = { username };
        if (password?.trim()) data.password = encrypt(password);

        await botRepo.update(botId, data);

        if (child.botConfig) {
            child.botConfig.username = username;
            if (data.password) child.botConfig.password = data.password;
        }

        const config = { ...child.botConfig };
        this.appendLog(botId, `[API] Credentials изменены: ${username}, рестарт...`);
        child.send({ type: 'credentials_operation_response', requestId, payload: { success: true } });

        setTimeout(() => this.restartBot(botId, config), 3000);
    }

    _handleExit(botId, botConfig, code, signal) {
        this.processManager.remove(botId);
        this.emitStatusUpdate(botId, 'stopped', `Процесс завершился с кодом ${code} (сигнал: ${signal || 'none'}).`);

        try {
            const { getIOSafe } = require('../../real-time/socketHandler');
            const { broadcastBotStatus } = require('../../real-time/botApi');
            broadcastBotStatus(getIOSafe(), botId, false);
        } catch (e) {}

        if (code === 1) {
            this.crashRestartManager.handleCrash(botId, botConfig, (msg) => this.appendLog(botId, msg));
        }
    }
}

module.exports = BotIPCMessageRouter;