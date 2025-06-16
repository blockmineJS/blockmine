const { fork } = require('child_process');
const path = require('path');
const { getIO } = require('../real-time/socketHandler');
const { PrismaClient } = require('@prisma/client');
const pidusage = require('pidusage');
const DependencyService = require('./DependencyService');

const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const RealPermissionManager = require('./PermissionManager');
const RealUserService = require('./UserService');

const prisma = new PrismaClient();
const cooldowns = new Map();
const warningCache = new Map();
const WARNING_COOLDOWN = 10 * 1000;


const TELEMETRY_ENABLED = 'true';
const STATS_SERVER_URL = 'http://185.65.200.184:3000';
let instanceId = null;
const DATA_DIR = path.join(os.homedir(), '.blockmine');

if (TELEMETRY_ENABLED && STATS_SERVER_URL) {
    const idPath = path.join(DATA_DIR, '.instance_id');
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        instanceId = fs.readFileSync(idPath, 'utf-8');
    } catch (e) {
        instanceId = uuidv4();
        fs.writeFileSync(idPath, instanceId, 'utf-8');
    }
}

class BotManager {
    constructor() {
        this.bots = new Map();
        this.logCache = new Map();
        this.resourceUsage = new Map();
        this.botConfigs = new Map();

        setInterval(() => this.updateAllResourceUsage(), 5000);
        

        if (TELEMETRY_ENABLED && STATS_SERVER_URL) {
            setInterval(() => this.sendHeartbeat(), 5 * 60 * 1000);
        }
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

    invalidateConfigCache(botId) {
        if (this.botConfigs.has(botId)) {
            this.botConfigs.delete(botId);
            console.log(`[BotManager] Invalidated config cache for bot ID ${botId}. It will be reloaded on next command.`);
        }
    }

    triggerHeartbeat() {
        if (this.heartbeatDebounceTimer) {
            clearTimeout(this.heartbeatDebounceTimer);
        }
        this.heartbeatDebounceTimer = setTimeout(() => {
            this.sendHeartbeat();
        }, 3000);
    }


    _sendThrottledWarning(botId, username, warningType, message, typeChat = 'private') {
        const cacheKey = `${botId}:${username}:${warningType}`;
        const now = Date.now();
        const lastWarning = warningCache.get(cacheKey);

        if (!lastWarning || (now - lastWarning > WARNING_COOLDOWN)) {
            this.sendMessageToBot(botId, message, typeChat, username);
            warningCache.set(cacheKey, now);
        }
    }


    async sendHeartbeat() {
        if (!instanceId) return;

        try {
            const runningBots = [];
            for (const botProcess of this.bots.values()) {
                if (botProcess.botConfig) {
                    runningBots.push({
                        username: botProcess.botConfig.username,
                        serverHost: botProcess.botConfig.server.host,
                        serverPort: botProcess.botConfig.server.port
                    });
                }
            }
            
            if (runningBots.length === 0) {
                return;
            }


            const challengeRes = await fetch(`${STATS_SERVER_URL}/api/challenge?uuid=${instanceId}`);
            if (!challengeRes.ok) {
                console.error(`[Telemetry] Сервер статистики вернул ошибку при получении challenge: ${challengeRes.statusText}`);
                return;
            }
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

        } catch (error) {
        }
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
        this.bots.forEach((childProcess, botId) => {
             if (childProcess && !childProcess.killed) {
                 statuses[botId] = 'running';
             }
        });
        const logs = {};
        this.logCache.forEach((logArray, botId) => {
            logs[botId] = logArray;
        });
        return { statuses, logs };
    }

    emitStatusUpdate(botId, status, message = null) {
        if (message) {
            this.appendLog(botId, `[SYSTEM] ${message}`);
        }
        getIO().emit('bot:status', { botId, status, message });
    }
    
    appendLog(botId, log) {
        const currentLogs = this.logCache.get(botId) || [];
        const newLogs = [log, ...currentLogs.slice(0, 499)];
        this.logCache.set(botId, newLogs);
        getIO().emit('bot:log', { botId, log });
    }

    async startBot(botConfig) {
        if (this.bots.has(botConfig.id)) {
            const existingProcess = this.bots.get(botConfig.id);
            if (existingProcess && !existingProcess.killed) {
                 console.error(`[BotManager] Попытка повторного запуска уже работающего бота ID: ${botConfig.id}. Запуск отменен.`);
                 this.appendLog(botConfig.id, `[SYSTEM-ERROR] Попытка повторного запуска. Запуск отменен.`);
                 return { success: false, message: 'Бот уже запущен или запускается.' };
            }
        }

        await this._syncSystemPermissions(botConfig.id);
        await this.loadConfigForBot(botConfig.id);

        this.logCache.set(botConfig.id, []);
        this.emitStatusUpdate(botConfig.id, 'starting', '');

        const allPluginsForBot = await prisma.installedPlugin.findMany({
            where: { botId: botConfig.id },
        });

        const enabledPlugins = allPluginsForBot.filter(p => p.isEnabled);

        const { sortedPlugins, pluginInfo, hasCriticalIssues } = DependencyService.resolveDependencies(enabledPlugins, allPluginsForBot);

        if (hasCriticalIssues) {
            this.appendLog(botConfig.id, '[DependencyManager] Обнаружены критические проблемы с зависимостями:');
            for (const plugin of Object.values(pluginInfo)) {
                if (plugin.issues.length > 0) {
                    this.appendLog(botConfig.id, `  - Плагин "${plugin.name}":`);
                    for (const issue of plugin.issues) {
                        const logMessage = `    - [${issue.type.toUpperCase()}] ${issue.message}`;
                        this.appendLog(botConfig.id, logMessage);
                    }
                }
            }
            this.appendLog(botConfig.id, '[DependencyManager] [FATAL] Запуск отменен.');
            this.emitStatusUpdate(botConfig.id, 'stopped', 'Ошибка зависимостей плагинов.');
            return { success: false, message: 'Критические ошибки в зависимостях плагинов.' };
        }
        
        const fullBotConfig = { ...botConfig, plugins: sortedPlugins };
        
        const botProcessPath = path.resolve(__dirname, 'BotProcess.js');
        const child = fork(botProcessPath, [], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });

        child.botConfig = botConfig;

        child.on('error', (err) => {
            this.appendLog(botConfig.id, `[PROCESS FATAL] КРИТИЧЕСКАЯ ОШИБКА ПРОЦЕССА: ${err.stack}`);
        });

        child.stderr.on('data', (data) => {
            this.appendLog(botConfig.id, `[STDERR] ${data.toString()}`);
        });

        child.on('message', async (message) => {
            if (message.type === 'log') {
                this.appendLog(botConfig.id, message.content);
            } else if (message.type === 'status') {
                this.emitStatusUpdate(botConfig.id, message.status); 
            } else if (message.type === 'validate_and_run_command') {
                await this.handleCommandValidation(botConfig, message);
            } else if (message.type === 'register_command') {
                await this.handleCommandRegistration(botConfig.id, message.commandConfig);
            }
        });

        child.on('exit', (code, signal) => {
            const botId = botConfig.id;
            this.bots.delete(botId);
            this.resourceUsage.delete(botId);
            this.botConfigs.delete(botId);
            this.emitStatusUpdate(botId, 'stopped', `Процесс завершился с кодом ${code} (сигнал: ${signal || 'none'}).`);
            this.updateAllResourceUsage();
        });

        this.bots.set(botConfig.id, child);
        child.send({ type: 'start', config: fullBotConfig });

        this.triggerHeartbeat();
        
        this.appendLog(botConfig.id, '[SYSTEM] Проверка зависимостей пройдена. Запускаем процесс бота...');
        return { success: true, message: 'Бот запускается' };
    }

    async handleCommandValidation(botConfig, message) {
        const { commandName, username, args, typeChat } = message;
        const botId = botConfig.id;

        try {
            let botConfigCache = this.botConfigs.get(botId);
            if (!botConfigCache) {
                botConfigCache = await this.loadConfigForBot(botId);
            }
            
            const user = await RealUserService.getUser(username, botId, botConfig);
            const child = this.bots.get(botId);
            
            if (!child) {
                console.warn(`[BotManager] No running bot process found for botId: ${botId} during command validation. Aborting.`);
                return;
            }

            if (user.isBlacklisted) {
                child.send({ type: 'handle_blacklist', commandName, username, typeChat });
                return;
            }
            
            const mainCommandName = botConfigCache.commandAliases.get(commandName) || commandName;
            const dbCommand = botConfigCache.commands.get(mainCommandName);
            
            if (!dbCommand || (!dbCommand.isEnabled && !user.isOwner)) {
                return;
            }
    
            const allowedTypes = JSON.parse(dbCommand.allowedChatTypes || '[]');
            if (!allowedTypes.includes(typeChat) && !user.isOwner) {
                if (typeChat === 'global') {
                    return;
                }
                child.send({ type: 'handle_wrong_chat', commandName: dbCommand.name, username, typeChat });
                return;
            }
            
            const permission = dbCommand.permissionId ? botConfigCache.permissionsById.get(dbCommand.permissionId) : null;
            if (permission && !user.hasPermission(permission.name)) {
                child.send({ type: 'handle_permission_error', commandName: dbCommand.name, username, typeChat });
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
                    child.send({ type: 'handle_cooldown', commandName: dbCommand.name, username, typeChat, timeLeft });
                    return;
                }
                cooldowns.set(cooldownKey, now);
            }

            child.send({ type: 'execute_handler', commandName: dbCommand.name, username, args, typeChat });

        } catch (error) {
            console.error(`[BotManager] Command validation error for botId: ${botId}`, {
                command: commandName,
                user: username,
                error: error.message,
                stack: error.stack
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

    stopBot(botId) {
        const child = this.bots.get(botId);
        if (child) {
            child.send({ type: 'stop' });
            this.botConfigs.delete(botId);
            return { success: true };
        }
        return { success: false, message: 'Бот не найден или уже остановлен' };
    }
    
    sendMessageToBot(botId, message, chatType = 'command', username = null) {
        const child = this.bots.get(botId);
        if (child) {
            child.send({ type: 'chat', payload: { message, chatType, username } });
            return { success: true };
        }
        return { success: false, message: 'Бот не найден или не запущен' };
    }

    invalidateUserCache(botId, username) {
        RealUserService.clearCache(username, botId);
        const child = this.bots.get(botId);
        if (child) {
            child.send({ type: 'invalidate_user_cache', username });
        }
        return { success: true };
    }
}

module.exports = new BotManager();