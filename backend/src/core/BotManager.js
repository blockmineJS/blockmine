const { fork } = require('child_process');
const path = require('path');
const prisma = require('../lib/prisma');
const pidusage = require('pidusage');
const DependencyService = require('./DependencyService');
const config = require('../config');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { decrypt } = require('./utils/crypto');
const EventGraphManager = require('./EventGraphManager');
const nodeRegistry = require('./NodeRegistry');
const UserService = require('./UserService');

const cooldowns = new Map();
const warningCache = new Map();
const WARNING_COOLDOWN = 10 * 1000;

const STATS_SERVER_URL = 'http://185.65.200.184:3000';
let instanceId = null;
const DATA_DIR = path.join(os.homedir(), '.blockmine');
const INSTANCE_ID_PATH = path.join(DATA_DIR, '.instance_id');

function getInstanceId() {
    if (instanceId) return instanceId;
    try {
        if (fs.existsSync(INSTANCE_ID_PATH)) {
            instanceId = fs.readFileSync(INSTANCE_ID_PATH, 'utf-8');
        } else {
            instanceId = uuidv4();
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            fs.writeFileSync(INSTANCE_ID_PATH, instanceId, 'utf-8');
        }
    } catch (error) {
        console.error('[Telemetry] Ошибка при загрузке/создании Instance ID:', error);
        return null;
    }
    return instanceId;
}

class BotManager {
    constructor() {
        this.bots = new Map();
        this.logCache = new Map();
        this.resourceUsage = new Map();
        this.botConfigs = new Map();
        this.nodeRegistry = nodeRegistry;
        this.pendingPlayerListRequests = new Map();
        this.playerListCache = new Map();
        this.eventGraphManager = null;
        this.uiSubscriptions = new Map();
        this.crashCounters = new Map();

        getInstanceId();
        setInterval(() => this.updateAllResourceUsage(), 5000);
        setInterval(() => this.syncBotStatuses(), 10000);
        if (config.telemetry?.enabled) {
            setInterval(() => this.sendHeartbeat(), 5 * 60 * 1000);
        }
    }

    initialize() {
        if (!this.eventGraphManager) {
            this.eventGraphManager = new EventGraphManager(this);
        }
    }

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
        console.log(`[UI Sub] Сокет ${socket.id} подписался на ${pluginName} для бота ${botId}. Всего подписчиков: ${pluginSubscribers.size}`);

        const botProcess = this.bots.get(botId);
        if (botProcess && !botProcess.killed) {
            botProcess.send({ type: 'plugin:ui:start-updates', pluginName });
        }
    }

    unsubscribeFromPluginUi(botId, pluginName, socket) {
        const botSubscriptions = this.uiSubscriptions.get(botId);
        if (!botSubscriptions) return;

        const pluginSubscribers = botSubscriptions.get(pluginName);
        if (!pluginSubscribers) return;

        pluginSubscribers.delete(socket);
        console.log(`[UI Sub] Сокет ${socket.id} отписался от ${pluginName} для бота ${botId}. Осталось: ${pluginSubscribers.size}`);

        if (pluginSubscribers.size === 0) {
            const botProcess = this.bots.get(botId);
            if (botProcess && !botProcess.killed) {
                botProcess.send({ type: 'plugin:ui:stop-updates', pluginName });
            }
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

    async loadConfigForBot(botId) {
        console.log(`[BotManager] Caching configuration for bot ID ${botId}...`);
        try {
            const [commands, permissions] = await Promise.all([
                prisma.command.findMany({ where: { botId } }),
                prisma.permission.findMany({ where: { botId } }),
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
            this.botConfigs.set(botId, config);
            console.log(`[BotManager] Configuration for bot ID ${botId} cached successfully.`);
            return config;
        } catch (error) {
            console.error(`[BotManager] Failed to cache configuration for bot ${botId}:`, error);
            throw new Error(`Failed to load/cache bot configuration for botId ${botId}: ${error.message}`);
        }
    }
    
    async _ensureDefaultEventGraphs(botId) {
        return;
    }

    invalidateConfigCache(botId) {
        if (this.botConfigs.has(botId)) {
            this.botConfigs.delete(botId);
            console.log(`[BotManager] Invalidated config cache for bot ID ${botId}. It will be reloaded on next command.`);
        }
    }

    reloadBotConfigInRealTime(botId) {
        const { getIO } = require('../real-time/socketHandler');
        this.invalidateConfigCache(botId);
        const child = this.bots.get(botId);
        if (child && !child.killed) {
            child.send({ type: 'config:reload' });
            console.log(`[BotManager] Sent config:reload to bot process ${botId}`);
            getIO().emit('bot:config_reloaded', { botId });
        }
    }

    triggerHeartbeat() {
        if (!config.telemetry?.enabled) return;
        if (this.heartbeatDebounceTimer) {
            clearTimeout(this.heartbeatDebounceTimer);
        }
        this.heartbeatDebounceTimer = setTimeout(() => {
            this.sendHeartbeat();
        }, 3000);
    }

    async sendHeartbeat() {
        if (!config.telemetry?.enabled || !instanceId) return;
        try {
            const runningBots = Array.from(this.bots.values())
                .filter(p => p.botConfig)
                .map(p => ({
                    username: p.botConfig.username,
                    serverHost: p.botConfig.server.host,
                    serverPort: p.botConfig.server.port
                }));
            
            if (runningBots.length === 0) return;

            const challengeRes = await fetch(`${STATS_SERVER_URL}/api/challenge?uuid=${instanceId}`);
            if (!challengeRes.ok) throw new Error(`Challenge server error: ${challengeRes.statusText}`);
            
            const { challenge, difficulty, prefix } = await challengeRes.json();
            let nonce = 0;
            let hash = '';
            do {
                nonce++;
                hash = crypto.createHash('sha256').update(prefix + challenge + nonce).digest('hex');
            } while (!hash.startsWith('0'.repeat(difficulty)));
            
            const packageJson = require('../../../package.json');
            await fetch(`${STATS_SERVER_URL}/api/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceUuid: instanceId,
                    appVersion: packageJson.version,
                    bots: runningBots,
                    nonce: nonce
                })
            });
        } catch (error) {
            console.error(`[Telemetry] Не удалось отправить heartbeat: ${error.message}`);
        }
    }

    async _syncSystemPermissions(botId) {
        const systemPermissions = [
          { name: "admin.*", description: "Все права администратора" },
          { name: "admin.cooldown.bypass", description: "Обход кулдауна для админ-команд" },
          { name: "user.*", description: "Все права обычного пользователя" },
          { name: "user.say", description: "Доступ к простым командам" },
          { name: "user.cooldown.bypass", description: "Обход кулдауна для юзер-команд" },
        ];
        const systemGroups = ["User", "Admin"];
        const systemGroupPermissions = {
          "User": ["user.say"],
          "Admin": ["admin.*", "admin.cooldown.bypass", "user.cooldown.bypass", "user.*"]
        };
        console.log(`[Permission Sync] Синхронизация системных прав для бота ID ${botId}...`);
        for (const perm of systemPermissions) {
            await prisma.permission.upsert({
                where: { botId_name: { botId, name: perm.name } },
                update: { description: perm.description },
                create: { ...perm, botId, owner: 'system' }
            });
        }
        for (const groupName of systemGroups) {
            await prisma.group.upsert({
                where: { botId_name: { botId, name: groupName } },
                update: {},
                create: { name: groupName, botId, owner: 'system' }
            });
        }
        for (const [groupName, permNames] of Object.entries(systemGroupPermissions)) {
            const group = await prisma.group.findUnique({ where: { botId_name: { botId, name: groupName } } });
            if (group) {
                for (const permName of permNames) {
                    const permission = await prisma.permission.findUnique({ where: { botId_name: { botId, name: permName } } });
                    if (permission) {
                        await prisma.groupPermission.upsert({
                            where: { groupId_permissionId: { groupId: group.id, permissionId: permission.id } },
                            update: {},
                            create: { groupId: group.id, permissionId: permission.id }
                        });
                    }
                }
            }
        }
        console.log(`[Permission Sync] Синхронизация для бота ID ${botId} завершена.`);
    }

    async updateAllResourceUsage() {
        const { getIO } = require('../real-time/socketHandler');
        if (this.bots.size === 0) {
            if (this.resourceUsage.size > 0) {
                this.resourceUsage.clear();
                getIO().emit('bots:usage', []);
            }
            return;
        }
        const pids = Array.from(this.bots.values()).map(child => child.pid).filter(Boolean);
        if (pids.length === 0) return;
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
            getIO().emit('bots:usage', usageData);
        } catch (error) {}
    }

    getBotIdByPid(pid) {
        for (const [botId, child] of this.bots.entries()) {
            if (child.pid === pid) {
                return botId;
            }
        }
        return null;
    }

    getFullState() {
        const statuses = {};
        for (const [id, child] of this.bots.entries()) {
            statuses[id] = child.killed ? 'stopped' : 'running';
        }

        const logs = {};
        for (const [botId, logArray] of this.logCache.entries()) {
            logs[botId] = logArray;
        }

        return {
            statuses,
            logs,
        };
    }

    emitStatusUpdate(botId, status, message = null) {
        const { getIO } = require('../real-time/socketHandler');
        if (message) this.appendLog(botId, `[SYSTEM] ${message}`);
        getIO().emit('bot:status', { botId, status, message });
    }

    syncBotStatuses() {
        for (const [botId, child] of this.bots.entries()) {
            const actualStatus = child.killed ? 'stopped' : 'running';
            const { getIO } = require('../real-time/socketHandler');
            getIO().emit('bot:status', { botId, status: actualStatus });
        }
    }
    
    appendLog(botId, logContent) {
        const { getIO } = require('../real-time/socketHandler');
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

    async startBot(botConfig) {
        if (this.bots.has(botConfig.id) && !this.bots.get(botConfig.id).killed) {
            this.appendLog(botConfig.id, `[SYSTEM-ERROR] Попытка повторного запуска. Запуск отменен.`);
            return { success: false, message: 'Бот уже запущен или запускается.' };
        }

        await this._syncSystemPermissions(botConfig.id);
        await this.loadConfigForBot(botConfig.id);
        this.logCache.set(botConfig.id, []);
        this.emitStatusUpdate(botConfig.id, 'starting', '');

        const allPluginsForBot = await prisma.installedPlugin.findMany({ where: { botId: botConfig.id, isEnabled: true } });
        const { sortedPlugins, hasCriticalIssues, pluginInfo } = DependencyService.resolveDependencies(allPluginsForBot, allPluginsForBot);
        
        if (hasCriticalIssues) {
            this.appendLog(botConfig.id, '[DependencyManager] Обнаружены критические проблемы с зависимостями, запуск отменен.');

            const criticalIssueTypes = new Set(['missing_dependency', 'version_mismatch', 'circular_dependency']);

            for (const pluginId in pluginInfo) {
                const info = pluginInfo[pluginId];
                if (info.issues.length === 0) continue;

                const criticalIssues = info.issues.filter(issue => criticalIssueTypes.has(issue.type));

                if (criticalIssues.length > 0) {
                    this.appendLog(botConfig.id, `* Плагин "${info.name}":`);
                    for (const issue of criticalIssues) {
                        this.appendLog(botConfig.id, `  - ${issue.message}`);
                    }
                }
            }
            
            this.emitStatusUpdate(botConfig.id, 'stopped', 'Ошибка зависимостей плагинов.');
            return { success: false, message: 'Критические ошибки в зависимостях плагинов.' };
        }
        
        const decryptedConfig = { ...botConfig };
        if (decryptedConfig.password) decryptedConfig.password = decrypt(decryptedConfig.password);
        if (decryptedConfig.proxyPassword) decryptedConfig.proxyPassword = decrypt(decryptedConfig.proxyPassword);

        if (decryptedConfig.proxyUsername) decryptedConfig.proxyUsername = decryptedConfig.proxyUsername.trim();

        const fullBotConfig = { ...decryptedConfig, plugins: sortedPlugins };
        const botProcessPath = path.resolve(__dirname, 'BotProcess.js');
        const child = fork(botProcessPath, [], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {
                ...process.env,
                NODE_PATH: path.resolve(__dirname, '../../../node_modules')
            }
        });

        child.botConfig = botConfig;

        child.api = {
            sendMessage: (type, message, username) => {
                if (!child.killed) {
                    child.send({ type: 'chat', payload: { message, chatType: type, username } });
                }
            },
            sendLog: (message) => {
                this.appendLog(botConfig.id, message);
            }
        };

        child.on('message', async (message) => {
            const botId = botConfig.id;
            try {
                switch (message.type) {
                    case 'event':
                        if (this.eventGraphManager) {
                            this.eventGraphManager.handleEvent(botId, message.eventType, message.args);
                        }
                        break;
                    case 'plugin:data': {
                        const { plugin: pluginName, payload } = message;
                        const botSubscriptions = this.uiSubscriptions.get(botId);
                        if (!botSubscriptions) break;

                        const pluginSubscribers = botSubscriptions.get(pluginName);
                        if (pluginSubscribers && pluginSubscribers.size > 0) {
                            pluginSubscribers.forEach(socket => {
                                socket.emit('plugin:ui:dataUpdate', payload);
                            });
                        }
                        break;
                    }
                    case 'plugin:stopped':
                        break;
                    case 'log':
                        this.appendLog(botId, message.content);
                        break;
                    case 'status':
                        this.emitStatusUpdate(botId, message.status);
                        break;
                    case 'bot_ready':
                        this.emitStatusUpdate(botId, 'running', 'Бот успешно подключился к серверу.');
                        this.crashCounters.delete(botId);
                        break;
                    case 'validate_and_run_command':
                        await this.handleCommandValidation(botConfig, message);
                        break;
                    case 'register_command':
                        await this.handleCommandRegistration(botId, message.commandConfig);
                        break;
                    case 'register_group':
                        await this.handleGroupRegistration(botId, message.groupConfig);
                        break;
                    case 'register_permissions':
                        await this.handlePermissionsRegistration(botId, message);
                        break;
                    case 'add_permissions_to_group':
                        await this.handleAddPermissionsToGroup(botId, message);
                        break;
                    case 'request_user_action':
                        const { requestId, payload } = message;
                        const { targetUsername, action, data } = payload;
                        
                        try {
                            const user = await UserService.getUser(targetUsername, botConfig.id);
                            if (!user) throw new Error(`Пользователь ${targetUsername} не найден.`);
                            
                            let result;

                            switch (action) {
                                case 'addGroup':
                                    result = await user.addGroup(data.group);
                                    break;
                                case 'removeGroup':
                                    result = await user.removeGroup(data.group);
                                    break;
                                case 'addPermission':
                                    break;
                                case 'removePermission':
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
                            console.error(`[BotManager] Ошибка выполнения действия '${action}' для пользователя '${targetUsername}':`, error);
                            child.send({ type: 'user_action_response', requestId, error: error.message });
                        }
                        break;
                    case 'playerListUpdate':
                        break;
                    case 'get_player_list_response': {
                        const { requestId, payload } = message;
                        const request = this.pendingPlayerListRequests.get(requestId);
                        if (request) {
                            clearTimeout(request.timeout);
                            request.resolve(payload.players);
                            this.pendingPlayerListRequests.delete(requestId);
                        }
                        break;
                    }
                }
            } catch (error) {
                this.appendLog(botId, `[SYSTEM-ERROR] Критическая ошибка в обработчике сообщений от бота: ${error.stack}`);
                console.error(`[BotManager] Критическая ошибка в обработчике сообщений от бота ${botId}:`, error);
            }
        });

        child.on('error', (err) => this.appendLog(botConfig.id, `[PROCESS FATAL] ${err.stack}`));
        child.stdout.on('data', (data) => console.log(data.toString()));
        child.stderr.on('data', (data) => this.appendLog(botConfig.id, `[STDERR] ${data.toString()}`));
        
        child.on('exit', (code, signal) => {
            const botId = botConfig.id;
            this.bots.delete(botId);
            this.resourceUsage.delete(botId);
            this.botConfigs.delete(botId);

            this.emitStatusUpdate(botId, 'stopped', `Процесс завершился с кодом ${code} (сигнал: ${signal || 'none'}).`);
            this.updateAllResourceUsage();

            if (code === 1) {
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
                    console.log(`[BotManager] Бот ${botId} упал ${counter.count} раз подряд. Автоперезапуск остановлен.`);
                    this.appendLog(botId, `[SYSTEM] ❌ Обнаружено ${counter.count} критических ошибок подряд.`);
                    this.appendLog(botId, `[SYSTEM] 💡 Исправьте проблему и запустите бота вручную.`);
                    this.crashCounters.delete(botId);
                    return;
                }

                console.log(`[BotManager] Обнаружена ошибка с кодом 1 для бота ${botId}. Попытка ${counter.count}/${MAX_RESTART_ATTEMPTS}. Перезапуск через 5 секунд...`);
                this.appendLog(botId, `[SYSTEM] Обнаружена критическая ошибка, перезапуск через 5 секунд... (попытка ${counter.count}/${MAX_RESTART_ATTEMPTS})`);
                setTimeout(() => {
                    console.log(`[BotManager] Перезапуск бота ${botId}...`);
                    this.startBot(botConfig);
                }, 5000);
            }
        });

        this.bots.set(botConfig.id, child);
        child.send({ type: 'start', config: fullBotConfig });

        await this.eventGraphManager.loadGraphsForBot(botConfig.id);
        
        this.triggerHeartbeat();
        const { getIO } = require('../real-time/socketHandler');
        getIO().emit('bot:status', { botId: botConfig.id, status: 'starting' });
        return child;
    }

    async handleCommandValidation(botConfig, message) {
        const { commandName, username, args, typeChat } = message;
        const botId = botConfig.id;

        try {
            let botConfigCache = this.botConfigs.get(botId);
            if (!botConfigCache) {
                console.log(`[BotManager] No cache for ${botId}, loading...`);
                botConfigCache = await this.loadConfigForBot(botId);
            }

            const user = await UserService.getUser(username, botId, botConfig);

            const child = this.bots.get(botId);
            if (!child) return;

            if (user.isBlacklisted) {
                child.send({ 
                    type: 'handle_blacklist', 
                    commandName: commandName, 
                    username, 
                    typeChat 
                });
                return;
            }

            const mainCommandName = botConfigCache.commandAliases.get(commandName) || commandName;
            const dbCommand = botConfigCache.commands.get(mainCommandName);

            if (!dbCommand || (!dbCommand.isEnabled && !user.isOwner)) {
                return;
            }

            const allowedTypes = JSON.parse(dbCommand.allowedChatTypes || '[]');
            if (!allowedTypes.includes(typeChat) && !user.isOwner) {
                if (typeChat === 'global') return;
                child.send({ 
                    type: 'handle_wrong_chat', 
                    commandName: dbCommand.name, 
                    username, 
                    typeChat 
                });
                return;
            }

            const permission = dbCommand.permissionId ? botConfigCache.permissionsById.get(dbCommand.permissionId) : null;
            if (permission && !user.hasPermission(permission.name)) {
                child.send({ 
                    type: 'handle_permission_error', 
                    commandName: dbCommand.name, 
                    username, 
                    typeChat 
                });
                return;
            }
            
            const domain = (permission?.name || '').split('.')[0] || 'user';
            const bypassCooldownPermission = `${domain}.cooldown.bypass`;

            if (dbCommand.cooldown > 0 && !user.isOwner && !user.hasPermission(bypassCooldownPermission)) {
                const cooldownKey = `${botId}:${dbCommand.name}:${user.id}`;
                const now = Date.now();
                const lastUsed = cooldowns.get(cooldownKey);

                if (lastUsed && (now - lastUsed < dbCommand.cooldown * 1000)) {
                    const timeLeft = Math.ceil((dbCommand.cooldown * 1000 - (now - lastUsed)) / 1000);
                    child.send({ 
                        type: 'handle_cooldown', 
                        commandName: dbCommand.name, 
                        username, 
                        typeChat, 
                        timeLeft 
                    });
                    return;
                }
                cooldowns.set(cooldownKey, now);
            }

            if (this.eventGraphManager) {
                this.eventGraphManager.handleEvent(botId, 'command', {
                    commandName: dbCommand.name,
                    user: { username },
                    args,
                    typeChat
                });
            }

            child.send({ type: 'execute_handler', commandName: dbCommand.name, username, args, typeChat });

        } catch (error) {
            console.error(`[BotManager] Command validation error for botId: ${botId}`, {
                command: commandName, user: username, error: error.message, stack: error.stack
            });
            this.sendMessageToBot(botId, `Произошла внутренняя ошибка при выполнении команды.`, 'private', username);
        }
    }

    async handleCommandRegistration(botId, commandConfig) {
        try {
            let permissionId = null;
            if (commandConfig.permissions) {
                let permission = await prisma.permission.findUnique({
                    where: { botId_name: { botId, name: commandConfig.permissions } }
                });
                if (!permission) {
                    permission = await prisma.permission.create({
                        data: {
                            botId,
                            name: commandConfig.permissions,
                            description: `Автоматически создано для команды ${commandConfig.name}`,
                            owner: commandConfig.owner,
                        }
                    });
                }
                permissionId = permission.id;
            }
            const createData = {
                botId,
                name: commandConfig.name,
                description: commandConfig.description,
                aliases: JSON.stringify(commandConfig.aliases || []),
                owner: commandConfig.owner,
                permissionId: permissionId,
                allowedChatTypes: JSON.stringify(commandConfig.allowedChatTypes || []),
                cooldown: commandConfig.cooldown || 0,
            };
            const updateData = {
                description: commandConfig.description,
                owner: commandConfig.owner,
            };
            await prisma.command.upsert({
                where: { botId_name: { botId, name: commandConfig.name } },
                update: updateData,
                create: createData,
            });
            this.invalidateConfigCache(botId);
        } catch (error) {
            console.error(`[BotManager] Ошибка при регистрации команды '${commandConfig.name}':`, error);
        }
    }

    async handleGroupRegistration(botId, groupConfig) {
        try {
            await prisma.group.upsert({
                where: { botId_name: { botId, name: groupConfig.name } },
                update: {
                    owner: groupConfig.owner,
                },
                create: {
                    botId,
                    name: groupConfig.name,
                    owner: groupConfig.owner,
                },
            });
            this.invalidateConfigCache(botId);
        } catch (error) {
            console.error(`[BotManager] Ошибка при регистрации группы '${groupConfig.name}':`, error);
        }
    }

    async handlePermissionsRegistration(botId, message) {
        try {
            const { permissions } = message;
            for (const perm of permissions) {
                if (!perm.name || !perm.owner) {
                    console.warn(`[BotManager] Пропущено право без имени или владельца для бота ${botId}:`, perm);
                    continue;
                }
                await prisma.permission.upsert({
                    where: { botId_name: { botId, name: perm.name } },
                    update: { description: perm.description },
                    create: {
                        botId,
                        name: perm.name,
                        description: perm.description || '',
                        owner: perm.owner,
                    },
                });
            }
            this.invalidateConfigCache(botId);
        } catch (error) {
            console.error(`[BotManager] Ошибка при регистрации прав для бота ${botId}:`, error);
        }
    }

    async handleAddPermissionsToGroup(botId, message) {
        try {
            const { groupName, permissionNames } = message;
            
            const group = await prisma.group.findUnique({
                where: { botId_name: { botId, name: groupName } }
            });

            if (!group) {
                console.warn(`[BotManager] Попытка добавить права в несуществующую группу "${groupName}" для бота ID ${botId}.`);
                return;
            }

            for (const permName of permissionNames) {
                const permission = await prisma.permission.findUnique({
                    where: { botId_name: { botId, name: permName } }
                });

                if (permission) {
                    await prisma.groupPermission.upsert({
                        where: { groupId_permissionId: { groupId: group.id, permissionId: permission.id } },
                        update: {},
                        create: { groupId: group.id, permissionId: permission.id },
                    });
                } else {
                    console.warn(`[BotManager] Право "${permName}" не найдено для бота ID ${botId} при добавлении в группу "${groupName}".`);
                }
            }
            
            this.invalidateConfigCache(botId);
        } catch (error) {
            console.error(`[BotManager] Ошибка при добавлении прав в группу "${message.groupName}" для бота ${botId}:`, error);
        }
    }

    stopBot(botId) {
        const child = this.bots.get(botId);
        if (child) {
            this.eventGraphManager.unloadGraphsForBot(botId);
            
            child.send({ type: 'stop' });
            
            setTimeout(() => {
                if (!child.killed) {
                    console.log(`[BotManager] Принудительное завершение процесса бота ${botId}`);
                    try {
                        child.kill('SIGKILL');
                    } catch (error) {
                        console.error(`[BotManager] Ошибка при принудительном завершении бота ${botId}:`, error);
                    }
                }
            }, 5000);
            
            this.botConfigs.delete(botId);
            return { success: true };
        }
        return { success: false, message: 'Бот не найден или уже остановлен' };
    }
    
    sendMessageToBot(botId, message, chatType = 'command', username = null) {
        const child = this.bots.get(botId);
        if (child) {
            child.api.sendMessage(chatType, message, username);
            return { success: true };
        }
        return { success: false, message: 'Бот не найден или не запущен' };
    }

    invalidateUserCache(botId, username) {
        UserService.clearCache(username, botId);
        const child = this.bots.get(botId);
        if (child) {
            child.send({ type: 'invalidate_user_cache', username });
        }
        return { success: true };
    }

    invalidateAllUserCache(botId) {
        for (const [cacheKey, user] of UserService.cache.entries()) {
            if (cacheKey.startsWith(`${botId}:`)) {
                UserService.cache.delete(cacheKey);
            }
        }
        console.log(`[BotManager] Кэш пользователей очищен для бота ${botId}`);
        
        const child = this.bots.get(botId);
        if (child && !child.killed) {
            child.send({ type: 'invalidate_all_user_cache' });
            console.log(`[BotManager] Отправлено сообщение об очистке кэша в процесс бота ${botId}`);
        }
        
        return { success: true };
    }

    async getPlayerList(botId) {
        const PLAYER_LIST_CACHE_TTL = 2000;

        const child = this.bots.get(botId);
        if (!child || child.killed) {
            return [];
        }

        const cachedEntry = this.playerListCache.get(botId);
        if (cachedEntry && (Date.now() - cachedEntry.timestamp < PLAYER_LIST_CACHE_TTL)) {
            return cachedEntry.promise;
        }

        const newPromise = new Promise((resolve) => {
            const requestId = uuidv4();
            const timeout = setTimeout(() => {
                this.pendingPlayerListRequests.delete(requestId);
                if (this.playerListCache.get(botId)?.promise === newPromise) {
                    this.playerListCache.delete(botId);
                }
                resolve([]);
            }, 5000);

            this.pendingPlayerListRequests.set(requestId, {
                resolve: (playerList) => {
                    clearTimeout(timeout);
                    this.pendingPlayerListRequests.delete(requestId);
                    this.playerListCache.set(botId, {
                        promise: Promise.resolve(playerList),
                        timestamp: Date.now()
                    });
                    resolve(playerList);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    this.pendingPlayerListRequests.delete(requestId);
                    if (this.playerListCache.get(botId)?.promise === newPromise) {
                        this.playerListCache.delete(botId);
                    }
                    resolve([]);
                },
            });

            child.send({ type: 'system:get_player_list', requestId });
        });

        this.playerListCache.set(botId, {
            promise: newPromise,
            timestamp: Date.now()
        });

        return newPromise;
    }

    setEventGraphManager(manager) {
        this.eventGraphManager = manager;
    }

    lookAt(botId, position) {
        const botProcess = this.bots.get(botId);
        if (botProcess && !botProcess.killed) {
            botProcess.send({ type: 'action', name: 'lookAt', payload: { position } });
        } else {
            console.error(`[BotManager] Не удалось найти запущенный процесс для бота ${botId}, чтобы выполнить lookAt.`);
        }
    }

    async reloadPlugins(botId) {
        const child = this.bots.get(botId);
        if (child && !child.killed) {
            child.send({ type: 'plugins:reload' });
            console.log(`[BotManager] Sent plugins:reload to bot process ${botId}`);
            const { getIO } = require('../real-time/socketHandler');
            getIO().emit('bot:plugins_reloaded', { botId });
            return { success: true, message: 'Команда на перезагрузку плагинов отправлена.' };
        }
        return { success: false, message: 'Бот не запущен.' };
    }

    sendServerCommandToBot(botId, command) {
        const child = this.bots.get(botId);
        if (child) {
            child.send({ type: 'server_command', payload: { command } });
        }
    }
}

module.exports = new BotManager();
