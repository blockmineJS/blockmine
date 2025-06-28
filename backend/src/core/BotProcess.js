const mineflayer = require('mineflayer');
const { SocksClient } = require('socks');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { Vec3 } = require('vec3');
const { PrismaClient } = require('@prisma/client');
const { loadCommands } = require('./system/CommandRegistry');
const { initializePlugins } = require('./PluginLoader');
const MessageQueue = require('./MessageQueue');
const Command = require('./system/Command');
const { parseArguments } = require('./system/parseArguments');
const GraphExecutionEngine = require('./GraphExecutionEngine');
const NodeRegistry = require('./NodeRegistry');

const UserService = require('./ipc/UserService.stub.js');
const PermissionManager = require('./ipc/PermissionManager.stub.js');

let bot = null;
const pendingRequests = new Map();
const entityMoveThrottles = new Map();

function sendLog(content) {
    if (process.send) {
        process.send({ type: 'log', content });
    } else {
        console.log(`[ChildProcess Log] ${content}`);
    }
}

function sendPlayerList() {
    if (process.send && bot) {
        const playerList = Object.keys(bot.players);
        process.send({ type: 'playerListUpdate', data: { players: playerList } });
    }
}

// --- НАЧАЛО ИЗМЕНЕНИЙ ---
// Исправляем функцию для отправки событий в едином "плоском" формате
function sendEvent(eventName, eventArgs) {
    if (process.send) {
        process.send({ type: 'event', eventType: eventName, args: eventArgs });
    }
}
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

async function fetchNewConfig(botId) {
    try {
        const botData = await prisma.bot.findUnique({
            where: { id: botId },
            include: {
                server: true,
                installedPlugins: {
                    where: { isEnabled: true }
                },
            }
        });

        if (!botData) return null;

        const commands = await prisma.command.findMany({ where: { botId } });

        return { ...botData, commands };
    } catch (error) {
        sendLog(`[fetchNewConfig] Error: ${error.message}`);
        return null;
    }
}

function handleIncomingCommand(type, username, message) {
    if (!message.startsWith(bot.config.prefix || '@')) return;

    const rawMessage = message.slice((bot.config.prefix || '@').length).trim();
    const commandParts = rawMessage.split(/ +/);
    const commandName = commandParts.shift().toLowerCase();
    const restOfMessage = commandParts.join(' ');

    const commandInstance = bot.commands.get(commandName) ||
    Array.from(bot.commands.values()).find(cmd => cmd.aliases.includes(commandName));

    if (!commandInstance) return;

    try {
        const processedArgs = {};
        const parsedArgs = parseArguments(restOfMessage);
        let currentArgIndex = 0;

        for (const argDef of commandInstance.isVisual ? JSON.parse(dbCommand.argumentsJson || '[]') : commandInstance.args) {
            if (argDef.type === 'greedy_string') {
                if (currentArgIndex < parsedArgs.length) {
                    processedArgs[argDef.name] = parsedArgs.slice(currentArgIndex).join(' ');
                    currentArgIndex = parsedArgs.length;
                }
            } else if (currentArgIndex < parsedArgs.length) {
                let value = parsedArgs[currentArgIndex];
                if (argDef.type === 'number') {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) {
                        bot.api.sendMessage(type, `Ошибка: Аргумент \"${argDef.description}\" должен быть числом.`, username);
                        return;
                    }
                    value = numValue;
                }
                processedArgs[argDef.name] = value;
                currentArgIndex++;
            }

            if (processedArgs[argDef.name] === undefined) {
                if (argDef.required) {
                    const usage = commandInstance.args.map(arg => {
                        return arg.required ? `<${arg.description || arg.name}>` : `[${arg.description || arg.name}]`;
                    }).join(' ');

                    bot.api.sendMessage(type, `Ошибка: Необходимо указать: ${argDef.description || argDef.name}`, username);
                    bot.api.sendMessage(type, `Использование: ${bot.config.prefix}${commandInstance.name} ${usage}`, username);
                    return;
                }
                if (argDef.default !== undefined) {
                    processedArgs[argDef.name] = argDef.default;
                }
            }
        }
        
        if (process.send) {
            process.send({
                type: 'validate_and_run_command',
                commandName: commandInstance.name,
                username,
                args: processedArgs,
                typeChat: type
            });
        }
    } catch (e) {
        sendLog(`[BotProcess] Ошибка парсинга аргументов: ${e.message}`);
    }
}

process.on('message', async (message) => {
    if (message.type === 'user_action_response') {
        if (pendingRequests.has(message.requestId)) {
            const { resolve, reject } = pendingRequests.get(message.requestId);
            if (message.error) {
                reject(new Error(message.error));
            } else {
                resolve(message.payload);
            }
            pendingRequests.delete(message.requestId);
        }
    } else if (message.type === 'start') {
        const config = message.config;
        sendLog(`[System] Получена команда на запуск бота ${config.username}...`);
        try {
            const botOptions = {
                host: config.server.host,
                port: config.server.port,
                username: config.username,
                password: config.password,
                version: config.server.version,
                auth: 'offline',
                hideErrors: false,
            };

            if (config.proxyHost && config.proxyPort) {
                sendLog(`[System] Используется прокси: ${config.proxyHost}:${config.proxyPort}`);
                botOptions.connect = (client) => {
                   SocksClient.createConnection({
                       proxy: {
                           host: config.proxyHost,
                           port: config.proxyPort,
                           type: 5,
                           userId: config.proxyUsername,
                           password: config.proxyPassword
                       },
                       command: 'connect',
                       destination: {
                           host: config.server.host,
                           port: config.server.port
                       }
                   }).then(info => {
                       client.setSocket(info.socket);
                       client.emit('connect');
                   }).catch(err => {
                       sendLog(`[Proxy Error] ${err.message}`);
                       client.emit('error', err);
                   });
                }
           } else {
                sendLog(`[System] Прокси не настроен, используется прямое подключение.`);
            }

            bot = mineflayer.createBot(botOptions);

            let isReady = false;

            bot.events = new EventEmitter();
            bot.events.setMaxListeners(30);
            bot.config = config;
            bot.sendLog = sendLog;
            bot.messageQueue = new MessageQueue(bot);

            const installedPluginNames = config.plugins.map(p => p.name);
            bot.api = {
                Command: Command,
                events: bot.events,
                sendMessage: (type, message, username) => bot.messageQueue.enqueue(type, message, username),
                sendMessageAndWaitForReply: (command, patterns, timeout) => bot.messageQueue.enqueueAndWait(command, patterns, timeout),
                getUser: (username) => UserService.getUser(username, bot.config.id, bot.config),
                registerPermissions: (permissions) => PermissionManager.registerPermissions(bot.config.id, permissions),
                registerGroup: (groupConfig) => PermissionManager.registerGroup(bot.config.id, groupConfig),
                addPermissionsToGroup: (groupName, permissionNames) => PermissionManager.addPermissionsToGroup(bot.config.id, groupName, permissionNames),
                installedPlugins: installedPluginNames,
                registerCommand: (commandInstance) => {
                    if (!(commandInstance instanceof Command)) {
                        throw new Error('registerCommand ожидает экземпляр класса Command.');
                    }
                    bot.commands.set(commandInstance.name, commandInstance);
                    if (process.send) {
                        process.send({
                            type: 'register_command',
                            commandConfig: {
                                name: commandInstance.name,
                                description: commandInstance.description,
                                aliases: commandInstance.aliases,
                                owner: commandInstance.owner,
                                permissions: commandInstance.permissions,
                                cooldown: commandInstance.cooldown,
                                allowedChatTypes: commandInstance.allowedChatTypes,
                            }
                        });
                    }
                    sendLog(`[API] Команда \"${commandInstance.name}\" от плагина \"${commandInstance.owner}\" зарегистрирована в процессе.`);
                },
                performUserAction: (username, action, data = {}) => {
                    return new Promise((resolve, reject) => {
                        const requestId = uuidv4();
                        pendingRequests.set(requestId, { resolve, reject });
        
                        if (process.send) {
                            process.send({
                                type: 'request_user_action',
                                requestId,
                                payload: {
                                    targetUsername: username,
                                    action,
                                    data
                                }
                            });
                        } else {
                            reject(new Error('IPC channel is not available.'));
                        }
        
                        setTimeout(() => {
                            if (pendingRequests.has(requestId)) {
                                reject(new Error('Request to main process timed out.'));
                                pendingRequests.delete(requestId);
                            }
                        }, 5000);
                    });
                },
                executeCommand: (command) => {
                    sendLog(`[Graph] Выполнение серверной команды: ${command}`);
                    bot.chat(command);
                },
                lookAt: (position) => {
                    if (bot && position) {
                        bot.lookAt(position);
                    }
                }
            };

            const processApi = {
                appendLog: (botId, message) => {
                    if (process.send) {
                        process.send({ type: 'log', content: message });
                    }
                }
            };

            bot.graphExecutionEngine = new GraphExecutionEngine(NodeRegistry, processApi);

            bot.commands = await loadCommands();

            const prisma = new PrismaClient();
            const dbCommands = await prisma.command.findMany({ where: { botId: config.id } });
            await prisma.$disconnect();

            for (const dbCommand of dbCommands) {
                if (!dbCommand.isEnabled) {
                    if (bot.commands.has(dbCommand.name)) {
                        bot.commands.delete(dbCommand.name);
                    }
                    continue;
                }

                const existingCommand = bot.commands.get(dbCommand.name);

                if (existingCommand) {
                    existingCommand.description = dbCommand.description;
                    existingCommand.cooldown = dbCommand.cooldown;
                    existingCommand.aliases = JSON.parse(dbCommand.aliases || '[]');
                    existingCommand.permissionId = dbCommand.permissionId;
                    existingCommand.allowedChatTypes = JSON.parse(dbCommand.allowedChatTypes || '[]');
                } else if (dbCommand.isVisual) {
                    const visualCommand = new Command({
                        name: dbCommand.name,
                        description: dbCommand.description,
                        aliases: JSON.parse(dbCommand.aliases || '[]'),
                        cooldown: dbCommand.cooldown,
                        allowedChatTypes: JSON.parse(dbCommand.allowedChatTypes || '[]'),
                        args: JSON.parse(dbCommand.argumentsJson || '[]'),
                        owner: 'visual_editor',
                    });
                    visualCommand.permissionId = dbCommand.permissionId;
                    visualCommand.graphJson = dbCommand.graphJson;
                    visualCommand.owner = 'visual_editor';
                    visualCommand.handler = (botInstance, typeChat, user, args) => {
                        const playerList = bot ? Object.keys(bot.players) : [];
                        const botState = bot ? { yaw: bot.entity.yaw, pitch: bot.entity.pitch } : {};
                        const context = { bot: botInstance.api, user, args, typeChat, players: playerList, botState };
                        return bot.graphExecutionEngine.execute(visualCommand.graphJson, context);
                    };
                    bot.commands.set(visualCommand.name, visualCommand);
                }
            }

            if (process.send) {
                for (const cmd of bot.commands.values()) {
                    process.send({
                        type: 'register_command',
                        commandConfig: {
                             name: cmd.name,
                            description: cmd.description,
                            aliases: cmd.aliases,
                            owner: cmd.owner,
                            permissions: cmd.permissions,
                            cooldown: cmd.cooldown,
                            allowedChatTypes: cmd.allowedChatTypes,
                        }
                    });
                }
            }
            
            await initializePlugins(bot, config.plugins);
            sendLog('[System] Все системы инициализированы.');

            let messageHandledByCustomParser = false;

            bot.on('message', (jsonMsg) => {
                const ansiMessage = jsonMsg.toAnsi();
                if (ansiMessage.trim()) {
                    sendLog(ansiMessage);
                }
                
                messageHandledByCustomParser = false;
                const rawMessageText = jsonMsg.toString();
                bot.events.emit('core:raw_message', rawMessageText, jsonMsg);
            });

            bot.events.on('chat:message', (data) => {
                messageHandledByCustomParser = true;
                sendEvent('chat', {
                    username: data.username,
                    message: data.message,
                    chatType: data.type,
                    raw: data.raw,
                });
                handleIncomingCommand(data.type, data.username, data.message);
            });

            bot.on('chat', (username, message) => {
                if (messageHandledByCustomParser) return;
                handleIncomingCommand('chat', username, message);
            });
            
            bot.on('login', () => {
                sendLog('[Event: login] Успешно залогинился!');
                if (process.send) {
                    process.send({ type: 'bot_ready' });
                    process.send({ type: 'status', status: 'running' });
                }
            });

            bot.on('kicked', (reason) => {
                let reasonText;
                try { reasonText = JSON.parse(reason).text || reason; } catch (e) { reasonText = reason; }
                sendLog(`[Event: kicked] Меня кикнули. Причина: ${reasonText}.`);
                process.exit(0);
            });

            bot.on('error', (err) => sendLog(`[Event: error] Произошла ошибка: ${err.stack || err.message}`));
            
            bot.on('end', (reason) => {
                sendLog(`[Event: end] Отключен от сервера. Причина: ${reason}`);
                process.exit(0);
            });

            bot.on('playerJoined', (player) => {
                if (!isReady) return;
                sendEvent('playerJoined', { user: { username: player.username, uuid: player.uuid } });
                sendPlayerList();
            });

            bot.on('playerLeft', (player) => {
                if (!isReady) return;
                sendEvent('playerLeft', { user: { username: player.username, uuid: player.uuid } });
                sendPlayerList();
            });

            bot.on('entitySpawn', (entity) => {
                if (entity.type === 'player' && entity.username) {
                    sendLog(`[BotProcess] Entity Spawned: ${entity.username}`);
                }
                const serialized = serializeEntity(entity);
                sendEvent('entitySpawn', { entity: serialized });
            });

            bot.on('entityMoved', (entity) => {
                const now = Date.now();
                const lastSent = entityMoveThrottles.get(entity.id) || 0;
                if (now - lastSent > 200) {
                    sendEvent('entityMoved', { entity: serializeEntity(entity) });
                    entityMoveThrottles.set(entity.id, now);
                }
            });

            bot.on('entityGone', (entity) => {
                sendEvent('entityGone', { entity: serializeEntity(entity) });
                entityMoveThrottles.delete(entity.id);
            });

            bot.on('spawn', () => {
                sendLog('[Event: spawn] Бот заспавнился в мире.');
                setTimeout(() => {
                    isReady = true;
                    sendLog('[BotProcess] Бот готов к приему событий playerJoined/playerLeft.');
                }, 3000);
            });

        } catch (err) {
            sendLog(`[CRITICAL] Критическая ошибка при создании бота: ${err.stack}`);
            process.exit(1);
        }
    } else if (message.type === 'config:reload') {
        sendLog('[System] Received config:reload command. Reloading configuration...');
        try {
            const newConfig = await fetchNewConfig(bot.config.id);
            if (newConfig) {
                bot.config = { ...bot.config, ...newConfig };
                const newCommands = await loadCommands();
                const newPlugins = bot.config.plugins;
                bot.commands = newCommands;
                await initializePlugins(bot, newPlugins, true);
                sendLog('[System] Bot configuration and plugins reloaded successfully.');
            } else {
                sendLog('[System] Failed to fetch new configuration.');
            }
        } catch (error) {
            sendLog(`[System] Error reloading configuration: ${error.message}`);
        }
    } else if (message.type === 'stop') {
        if (bot) bot.quit();
        else process.exit(0);
    } else if (message.type === 'chat') {
        if (bot && bot.entity) {
            const { message: msg, chatType, username } = message.payload;
            bot.messageQueue.enqueue(chatType, msg, username);
        }
    } else if (message.type === 'execute_handler') {
        const { commandName, username, args, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            const fakeUser = { username };
            commandInstance.handler(bot, typeChat, fakeUser, args).catch(e => {
                sendLog(`[Handler Error] Ошибка в handler-е команды ${commandName}: ${e.message}`);
            });
        }
    } else if (message.type === 'invalidate_user_cache') {
        if (message.username && bot && bot.config) {
            UserService.clearCache(message.username, bot.config.id);
        }
    } else if (message.type === 'handle_permission_error') {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            commandInstance.onInsufficientPermissions(bot, typeChat, { username });
        }
    } else if (message.type === 'handle_wrong_chat') {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            commandInstance.onWrongChatType(bot, typeChat, { username });
        }
    } else if (message.type === 'handle_cooldown') {
        const { commandName, username, typeChat, timeLeft } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            commandInstance.onCooldown(bot, typeChat, { username }, timeLeft);
        }
    } else if (message.type === 'handle_blacklist') {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            commandInstance.onBlacklisted(bot, typeChat, { username });
        }
    } else if (message.type === 'action') {
        if (message.name === 'lookAt' && bot && message.payload.position) {
            const { x, y, z } = message.payload.position;
            // Проверяем, что все координаты - числа, перед созданием Vec3
            if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
                bot.lookAt(new Vec3(x, y, z));
            } else {
                sendLog(`[BotProcess] Ошибка lookAt: получены невалидные координаты: ${JSON.stringify(message.payload.position)}`);
            }
        }
    }
});

process.on('unhandledRejection', (reason, promise) => {
    const errorMsg = `[FATAL] Необработанная ошибка процесса: ${reason?.stack || reason}`;
    sendLog(errorMsg);
    process.exit(1);
});

function serializeEntity(entity) {
    if (!entity) return null;
    return {
      id: entity.id,
      type: entity.type,
      username: entity.username,
      displayName: entity.displayName,
      position: entity.position,
      yaw: entity.yaw,
      pitch: entity.pitch,
      onGround: entity.onGround,
      isValid: entity.isValid,
      heldItem: entity.heldItem,
      equipment: entity.equipment,
      metadata: entity.metadata
    };
}