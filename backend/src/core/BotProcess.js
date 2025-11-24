const mineflayer = require('mineflayer');
const { SocksClient } = require('socks');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { Vec3 } = require('vec3');
const { PrismaClient } = require('@prisma/client');
const { loadCommands } = require('./system/CommandRegistry');
const { getRuntimeCommandRegistry } = require('./system/RuntimeCommandRegistry');
const { initializePlugins } = require('./PluginLoader');
const MessageQueue = require('./MessageQueue');
const Command = require('./system/Command');
const { parseArguments } = require('./system/parseArguments');
const GraphExecutionEngine = require('./GraphExecutionEngine');
const NodeRegistry = require('./NodeRegistry');

const UserService = require('./UserService');
const PermissionManager = require('./ipc/PermissionManager.stub.js');
const Transport = require('./system/Transport');
const CommandContext = require('./system/CommandContext');

let bot = null;
const prisma = new PrismaClient();
const pluginUiState = new Map();
const pendingRequests = new Map();
const entityMoveThrottles = new Map();
let connectionTimeout = null;
let botReadySent = false;
let viewerRenderDistance = 24; // Динамический радиус отображения для viewer

const originalJSONParse = JSON.parse
JSON.parse = function (text, reviver) {
    if (typeof text !== 'string') return originalJSONParse(text, reviver)
    try {
        return originalJSONParse(text, reviver)
    } catch (e) {
        const fixed = text.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        return originalJSONParse(fixed, reviver)
    }
}

function sendLog(content) {
    if (process.send) {
        process.send({ type: 'log', content });
    } else {
        console.log(`[ChildProcess Log] ${content}`);
    }
}


function sendEvent(eventName, eventArgs) {
    if (process.send) {
        // Добавляем информацию о боте (позицию) во все события
        const enrichedArgs = {
            ...eventArgs,
            botEntity: bot && bot.entity ? {
                position: bot.entity.position,
                yaw: bot.entity.yaw,
                pitch: bot.entity.pitch
            } : null
        };
        process.send({ type: 'event', eventType: eventName, args: enrichedArgs });
    }
}

async function fetchNewConfig(botId, prisma) {
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

    // Сначала проверяем стандартные команды
    let commandInstance = bot.commands.get(commandName) ||
        Array.from(bot.commands.values()).find(cmd => cmd.aliases.includes(commandName));

    if (!commandInstance) {
        // Если не найдена, проверяем временные команды из runtime registry
        const runtimeRegistry = getRuntimeCommandRegistry();
        commandInstance = runtimeRegistry.get(bot.config.id, commandName);
    }

    if (!commandInstance) {
        return;
    }

    try {
        const processedArgs = {};
        const parsedArgs = parseArguments(restOfMessage);
        let currentArgIndex = 0;

        const argsDef = commandInstance.isVisual && commandInstance.args ? commandInstance.args : (commandInstance.args || []);
        for (const argDef of argsDef) {
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
    if (message.type === 'plugin:ui:start-updates') {
        const { pluginName } = message;
        const state = pluginUiState.get(pluginName);
        if (state && process.send) {
            process.send({
                type: 'plugin:data',
                plugin: pluginName,
                payload: state
            });
        }
    } else if (message.type === 'user_action_response') {
        if (pendingRequests.has(message.requestId)) {
            const { resolve, reject } = pendingRequests.get(message.requestId);
            if (message.error) {
                reject(new Error(message.error));
            } else {
                resolve(message.payload);
            }
            pendingRequests.delete(message.requestId);
        }
    } else if (message.type === 'system:get_player_list') {
        const playerList = bot ? Object.keys(bot.players) : [];
        if (process.send) {
            process.send({
                type: 'get_player_list_response',
                requestId: message.requestId,
                payload: { players: playerList }
            });
        }
    } else if (message.type === 'system:get_nearby_entities') {
        const entities = [];
        if (bot && bot.entities) {
            const centerPos = message.payload?.position || bot.entity?.position;
            const radius = message.payload?.radius || 32;

            if (centerPos) {
                // Перебираем все сущности
                for (const entity of Object.values(bot.entities)) {
                    if (entity && entity.position && entity.isValid) {
                        // Вычисляем расстояние
                        const dx = entity.position.x - centerPos.x;
                        const dy = entity.position.y - centerPos.y;
                        const dz = entity.position.z - centerPos.z;
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                        // Если существо в радиусе, добавляем в список
                        if (distance <= radius) {
                            entities.push(serializeEntity(entity));
                        }
                    }
                }
            }
        }

        if (process.send) {
            process.send({
                type: 'get_nearby_entities_response',
                requestId: message.requestId,
                payload: { entities }
            });
        }
    } else if (message.type === 'viewer:get_state') {
        if (bot && process.send) {
            let blocks = undefined;

            if (message.includeBlocks && bot.entity?.position) {
                blocks = [];
                const pos = bot.entity.position;
                const horizontalRange = viewerRenderDistance;
                const verticalRangeDown = Math.min(viewerRenderDistance / 2, 16);
                const verticalRangeUp = viewerRenderDistance;

                for (let x = Math.floor(pos.x - horizontalRange); x <= Math.floor(pos.x + horizontalRange); x++) {
                    for (let y = Math.floor(pos.y - verticalRangeDown); y <= Math.floor(pos.y + verticalRangeUp); y++) {
                        for (let z = Math.floor(pos.z - horizontalRange); z <= Math.floor(pos.z + horizontalRange); z++) {
                            const block = bot.blockAt(new Vec3(x, y, z));
                            if (block && block.type !== 0) {
                                blocks.push({
                                    x, y, z,
                                    type: block.type,
                                    name: block.name
                                });
                            }
                        }
                    }
                }
            }

            const state = {
                status: bot._client ? 'online' : 'offline',
                health: bot.health || 20,
                food: bot.food || 20,
                position: bot.entity?.position ? {
                    x: bot.entity.position.x,
                    y: bot.entity.position.y,
                    z: bot.entity.position.z
                } : null,
                yaw: bot.entity?.yaw || 0,
                pitch: bot.entity?.pitch || 0,
                gameMode: bot.game?.gameMode,
                dimension: bot.game?.dimension,
                blocks,
                inventory: bot.inventory ? bot.inventory.items().map(item => ({
                    name: item.name,
                    displayName: item.displayName,
                    count: item.count,
                    slot: item.slot
                })) : [],
                nearbyPlayers: bot.entities ? Object.values(bot.entities)
                    .filter(e => e.type === 'player' && e.username !== bot.username)
                    .map(e => ({
                        username: e.username,
                        position: { x: e.position.x, y: e.position.y, z: e.position.z },
                        yaw: e.yaw || 0,
                        pitch: e.pitch || 0,
                        distance: bot.entity ? bot.entity.position.distanceTo(e.position) : 0
                    })) : [],
                nearbyMobs: bot.entities ? Object.values(bot.entities)
                    .filter(e => e.type === 'mob')
                    .map(e => ({
                        name: e.name || e.displayName,
                        mobType: e.mobType,
                        position: { x: e.position.x, y: e.position.y, z: e.position.z },
                        distance: bot.entity ? bot.entity.position.distanceTo(e.position) : 0
                    })) : []
            };

            process.send({
                type: 'viewer:state_response',
                requestId: message.requestId,
                payload: state
            });
        }
    } else if (message.type === 'viewer:control') {
        const { command } = message;
        if (!bot) return;

        try {
            switch (command.type) {
                case 'move':
                    bot.setControlState(command.direction, command.active);
                    break;

                case 'look':
                    if (command.yaw !== undefined) bot.entity.yaw = command.yaw;
                    if (command.pitch !== undefined) bot.entity.pitch = command.pitch;
                    break;

                case 'chat':
                    bot.chat(command.message);
                    break;

                case 'dig':
                    if (command.position) {
                        const block = bot.blockAt(new Vec3(command.position.x, command.position.y, command.position.z));
                        if (block) bot.dig(block).catch(err => sendLog(`[Viewer] Dig error: ${err.message}`));
                    }
                    break;

                case 'place':
                    if (command.position && command.blockType) {
                        const referenceBlock = bot.blockAt(new Vec3(command.position.x, command.position.y, command.position.z));
                        if (referenceBlock) {
                            const itemToPlace = bot.inventory.items().find(item => item.name === command.blockType);
                            if (itemToPlace) {
                                bot.equip(itemToPlace, 'hand')
                                    .then(() => bot.placeBlock(referenceBlock, new Vec3(0, 1, 0)))
                                    .catch(err => sendLog(`[Viewer] Place error: ${err.message}`));
                            }
                        }
                    }
                    break;

                case 'sync_position':
                    if (command.position && bot.entity) {
                        bot.entity.position.x = command.position.x;
                        bot.entity.position.y = command.position.y;
                        bot.entity.position.z = command.position.z;
                    }
                    break;

                case 'set_render_distance':
                    if (command.distance && command.distance >= 8 && command.distance <= 64) {
                        viewerRenderDistance = command.distance;
                        sendLog(`[Viewer] Render distance set to ${viewerRenderDistance}`);
                    }
                    break;
            }
        } catch (error) {
            sendLog(`[Viewer] Control error: ${error.message}`);
        }
    } else if (message.type === 'execute_event_graph') {
        // Выполнение event графа в child process
        const { botId, graph, eventType, eventArgs } = message;

        try {

            const playerList = bot ? Object.keys(bot.players) : [];
            const botApi = {
                sendMessage: (chatType, message, recipient) => {
                    if (!bot || !bot.messageQueue) {
                        sendLog('[EventGraph] Bot not ready');
                        return;
                    }

                    bot.messageQueue.enqueue(chatType, message, recipient);
                },
                executeCommand: (command) => {
                    if (!bot || !bot.messageQueue) {
                        sendLog('[EventGraph] Bot not ready');
                        return;
                    }
                    bot.messageQueue.enqueue('command', command);
                },
                lookAt: async (x, y, z) => {
                    if (!bot) return;
                    const target = new Vec3(x, y, z);
                    await bot.lookAt(target);
                },
                navigate: async (x, y, z) => {
                    if (!bot || !bot.pathfinder) return;
                    const goal = new (require('mineflayer-pathfinder').goals.GoalBlock)(x, y, z);
                    await bot.pathfinder.goto(goal);
                },
                attack: (entityId) => {
                    if (!bot) return;
                    const entity = bot.entities[entityId];
                    if (entity) bot.attack(entity);
                },
                follow: (username) => {
                    if (!bot || !bot.pathfinder) return;
                    const player = bot.players[username];
                    if (player && player.entity) {
                        const goal = new (require('mineflayer-pathfinder').goals.GoalFollow)(player.entity, 3);
                        bot.pathfinder.setGoal(goal, true);
                    }
                },
                stopFollow: () => {
                    if (bot && bot.pathfinder) {
                        bot.pathfinder.setGoal(null);
                    }
                }
            };

            const context = {
                bot: botApi,
                eventArgs: eventArgs || {},
                players: playerList,
                botState: bot ? {
                    health: bot.health,
                    food: bot.food,
                    position: bot.entity?.position,
                    gameMode: bot.game?.gameMode
                } : {},
                botEntity: bot && bot.entity ? serializeEntity(bot.entity) : null,
                botId: botId,
                graphId: graph.id,
                eventType: eventType,
                eventArgs: eventArgs
            };

            const engine = new GraphExecutionEngine(NodeRegistry, botApi);
            await engine.execute(graph, context, eventType);


        } catch (error) {
            sendLog(`[EventGraph] Error executing ${eventType} graph: ${error.message}`);
            sendLog(`[EventGraph] Stack: ${error.stack}`);
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
                chat: 'enabled',
            };

            if (config.proxyHost && config.proxyPort) {
                sendLog(`[System] Используется прокси: ${config.proxyHost}:${config.proxyPort}`);

                const cleanProxyUsername = config.proxyUsername ? config.proxyUsername.trim() : null;
                const cleanProxyPassword = config.proxyPassword || null;

                botOptions.connect = (client) => {
                    SocksClient.createConnection({
                        proxy: {
                            host: config.proxyHost,
                            port: config.proxyPort,
                            type: 5,
                            userId: cleanProxyUsername,
                            password: cleanProxyPassword
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
                        sendLog(`[Proxy Error] SOCKS connection failed: ${err.message}. Bot will attempt to restart.`);
                        client.emit('error', err);
                        process.exit(1);
                    });
                }
            } else {
                sendLog(`[System] Прокси не настроен, используется прямое подключение.`);
            }

            bot = mineflayer.createBot(botOptions);

            connectionTimeout = setTimeout(() => {
                if (bot && !bot.player) {
                    sendLog('[System] Таймаут подключения к серверу (30 секунд). Завершение работы...');
                    process.exit(1);
                }
            }, 30000);

            bot.pluginUiState = pluginUiState;

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
                sendMessage: (type, message, username) => {
                    if (type === 'websocket') {
                        if (process.send) {
                            process.send({
                                type: 'send_websocket_message',
                                payload: {
                                    botId: bot.config.id,
                                    message: message,
                                }
                            });
                        }
                    } else {
                        bot.messageQueue.enqueue(type, message, username);
                    }
                },
                sendMessageAndWaitForReply: (command, patterns, timeout) => bot.messageQueue.enqueueAndWait(command, patterns, timeout),
                getUser: async (username) => {
                    return await UserService.getUser(username, bot.config.id, bot.config);
                },
                registerPermissions: (permissions) => PermissionManager.registerPermissions(bot.config.id, permissions),
                registerGroup: (groupConfig) => PermissionManager.registerGroup(bot.config.id, groupConfig),
                addPermissionsToGroup: (groupName, permissionNames) => PermissionManager.addPermissionsToGroup(bot.config.id, groupName, permissionNames),
                installedPlugins: installedPluginNames,
                registerCommand: async (command) => {
                    try {
                        const existingCommand = await prisma.command.findUnique({
                            where: {
                                botId_name: {
                                    botId: bot.config.id,
                                    name: command.name,
                                }
                            }
                        });

                        if (existingCommand) {
                            if (existingCommand.permissionId === null && command.permissions) {
                                const permission = await prisma.permission.upsert({
                                    where: {
                                        botId_name: {
                                            botId: bot.config.id,
                                            name: command.permissions,
                                        },
                                    },
                                    update: {},
                                    create: {
                                        botId: bot.config.id,
                                        name: command.permissions,
                                        description: `Автоматически создано для команды ${command.name}`,
                                        owner: command.owner || 'system',
                                    },
                                });

                                await prisma.command.update({
                                    where: { id: existingCommand.id },
                                    data: { permissionId: permission.id }
                                });
                            }
                        } else {
                            let permissionId = null;
                            if (command.permissions) {
                                const permission = await prisma.permission.upsert({
                                    where: {
                                        botId_name: {
                                            botId: bot.config.id,
                                            name: command.permissions,
                                        },
                                    },
                                    update: {},
                                    create: {
                                        botId: bot.config.id,
                                        name: command.permissions,
                                        description: `Автоматически создано для команды ${command.name}`,
                                        owner: command.owner || 'system',
                                    },
                                });
                                permissionId = permission.id;
                            }

                            let pluginOwnerId = null;
                            if (command.owner && command.owner.startsWith('plugin:')) {
                                const pluginName = command.owner.replace('plugin:', '');
                                const plugin = await prisma.installedPlugin.findFirst({
                                    where: {
                                        botId: bot.config.id,
                                        name: pluginName
                                    }
                                });
                                if (plugin) {
                                    pluginOwnerId = plugin.id;
                                }
                            }

                            const commandData = {
                                botId: bot.config.id,
                                name: command.name,
                                description: command.description || '',
                                owner: command.owner || 'unknown',
                                permissionId: permissionId,
                                cooldown: command.cooldown || 0,
                                isEnabled: command.isActive !== undefined ? command.isActive : true,
                                aliases: JSON.stringify(command.aliases || []),
                                allowedChatTypes: JSON.stringify(command.allowedChatTypes || ['chat', 'private']),
                                argumentsJson: JSON.stringify(command.args || []),
                                pluginOwnerId: pluginOwnerId,
                            };

                            await prisma.command.create({
                                data: commandData,
                            });
                        }

                        if (process.send) {
                            process.send({
                                type: 'register_command',
                                commandConfig: {
                                    name: command.name,
                                    description: command.description,
                                    aliases: command.aliases,
                                    owner: command.owner,
                                    permissions: command.permissions,
                                    cooldown: command.cooldown,
                                    allowedChatTypes: command.allowedChatTypes,
                                }
                            });
                        }

                        if (!bot.commands) bot.commands = new Map();
                        bot.commands.set(command.name, command);
                        if (Array.isArray(command.aliases)) {
                            for (const alias of command.aliases) {
                                bot.commands.set(alias, command);
                            }
                        }
                    } catch (error) {
                        sendLog(`[API] Ошибка при регистрации команды: ${error.message}`);
                    }
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
                        }, 10000);
                    });
                },
                registerEventGraph: async (graphData) => {
                    try {
                        let pluginOwnerId = null;
                        if (graphData.owner && graphData.owner.startsWith('plugin:')) {
                            const pluginName = graphData.owner.replace('plugin:', '');
                            const plugin = await prisma.installedPlugin.findFirst({
                                where: {
                                    botId: bot.config.id,
                                    name: pluginName
                                }
                            });
                            if (plugin) {
                                pluginOwnerId = plugin.id;
                            }
                        }

                        const graphDataToSave = {
                            botId: bot.config.id,
                            name: graphData.name,
                            isEnabled: graphData.isEnabled !== undefined ? graphData.isEnabled : true,
                            graphJson: graphData.graphJson || JSON.stringify({ nodes: [], connections: [] }),
                            variables: JSON.stringify(graphData.variables || []),
                            pluginOwnerId: pluginOwnerId,
                        };

                        const eventGraph = await prisma.eventGraph.upsert({
                            where: {
                                botId_name: {
                                    botId: bot.config.id,
                                    name: graphData.name
                                }
                            },
                            update: {
                                isEnabled: graphDataToSave.isEnabled,
                                graphJson: graphDataToSave.graphJson,
                                variables: graphDataToSave.variables,
                                pluginOwnerId: graphDataToSave.pluginOwnerId,
                            },
                            create: graphDataToSave,
                        });

                        if (graphData.triggers && Array.isArray(graphData.triggers)) {
                            await prisma.eventTrigger.deleteMany({
                                where: { graphId: eventGraph.id }
                            });

                            if (graphData.triggers.length > 0) {
                                await prisma.eventTrigger.createMany({
                                    data: graphData.triggers.map(eventType => ({
                                        graphId: eventGraph.id,
                                        eventType
                                    }))
                                });
                            }
                        }

                        sendLog(`[API] Граф события "${graphData.name}" от плагина "${graphData.owner}" зарегистрирован.`);
                        return eventGraph;
                    } catch (error) {
                        sendLog(`[API] Ошибка при регистрации графа события: ${error.message}`);
                        throw error;
                    }
                },
                executeCommand: (command) => {
                    sendLog(`[Graph] Выполнение серверной команды: ${command}`);
                    if (bot && bot.messageQueue) {
                        bot.messageQueue.enqueue('command', command);
                    }
                },
                lookAt: (position) => {
                    if (bot && position) {
                        bot.lookAt(position);
                    }
                },
                getNearbyEntities: (position = null, radius = 32) => {
                    const entities = [];
                    if (bot && bot.entities) {
                        const centerPos = position || bot.entity?.position;

                        if (centerPos) {
                            for (const entity of Object.values(bot.entities)) {
                                if (entity && entity.position && entity.isValid) {
                                    const dx = entity.position.x - centerPos.x;
                                    const dy = entity.position.y - centerPos.y;
                                    const dz = entity.position.z - centerPos.z;
                                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                                    if (distance <= radius) {
                                        entities.push(serializeEntity(entity));
                                    }
                                }
                            }
                        }
                    }
                    return entities;
                },
                sendLog: (message) => {
                    sendLog(message);
                },
                sendUiUpdate: (pluginName, stateUpdate) => {
                    const currentState = pluginUiState.get(pluginName) || {};
                    const newState = { ...currentState, ...stateUpdate };
                    pluginUiState.set(pluginName, newState);


                    if (process.send) {
                        process.send({
                            type: 'plugin:data',
                            plugin: pluginName,
                            payload: newState
                        });
                    }
                }
            };

            // Упрощенный alias для отправки сообщений (используется в командах и нодах)
            bot.sendMessage = (type, message, username) => {
                bot.api.sendMessage(type, message, username);
            };

            // Добавляем bot.sendLog для команд
            bot.sendLog = (message) => sendLog(message);

            const processApi = {
                appendLog: (botId, message) => {
                    if (process.send) {
                        process.send({ type: 'log', content: message });
                    }
                }
            };

            bot.graphExecutionEngine = new GraphExecutionEngine(NodeRegistry, processApi);

            bot.commands = await loadCommands();

            const dbCommands = await prisma.command.findMany({ where: { botId: config.id } });

            for (const dbCommand of dbCommands) {
                const existingCommand = bot.commands.get(dbCommand.name);

                // Не удаляем выключенные команды, а помечаем их
                // Владельцы смогут использовать выключенные команды через проверку в CommandExecutionService

                if (existingCommand) {
                    existingCommand.isEnabled = dbCommand.isEnabled;
                    existingCommand.description = dbCommand.description;
                    existingCommand.cooldown = dbCommand.cooldown;
                    existingCommand.aliases = JSON.parse(dbCommand.aliases || '[]');
                    existingCommand.permissionId = dbCommand.permissionId;
                    existingCommand.allowedChatTypes = JSON.parse(dbCommand.allowedChatTypes || '[]');

                    // Добавляем алиасы в bot.commands для быстрого доступа
                    const aliases = JSON.parse(dbCommand.aliases || '[]');
                    for (const alias of aliases) {
                        bot.commands.set(alias, existingCommand);
                    }
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
                        const playerList = botInstance ? Object.keys(botInstance.players) : [];
                        const botState = botInstance ? { yaw: botInstance.entity.yaw, pitch: botInstance.entity.pitch } : {};
                        const botEntity = botInstance && botInstance.entity ? {
                            position: botInstance.entity.position,
                            yaw: botInstance.entity.yaw,
                            pitch: botInstance.entity.pitch
                        } : null;

                        const context = {
                            bot: botInstance.api,
                            user,
                            args,
                            typeChat,
                            players: playerList,
                            botState,
                            botEntity,
                            botId: botInstance.config.id,
                            graphId: dbCommand.id,
                            eventType: 'command',
                            eventArgs: {
                                commandName: dbCommand.name,
                                user: { username: user?.username },
                                args,
                                typeChat
                            }
                        };

                        return botInstance.graphExecutionEngine.execute(visualCommand.graphJson, context);
                    };
                    bot.commands.set(visualCommand.name, visualCommand);

                    // Добавляем алиасы визуальных команд
                    const visualAliases = JSON.parse(dbCommand.aliases || '[]');
                    for (const alias of visualAliases) {
                        bot.commands.set(alias, visualCommand);
                    }
                }
            }

            // Добавляем алиасы для всех загруженных команд (системных и плагинов)
            for (const cmd of bot.commands.values()) {
                if (cmd.aliases && Array.isArray(cmd.aliases)) {
                    for (const alias of cmd.aliases) {
                        if (!bot.commands.has(alias)) {
                            bot.commands.set(alias, cmd);
                        }
                    }
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

            await initializePlugins(bot, config.plugins, prisma);
            sendLog('[System] Все системы инициализированы.');

            let messageHandledByCustomParser = false;

            bot.on('message', (jsonMsg) => {
                const logContent = jsonMsg.toAnsi();

                if (logContent.trim()) {
                    sendLog(logContent);
                }

                messageHandledByCustomParser = false;
                const rawMessageText = jsonMsg.toString();
                bot.events.emit('core:raw_message', rawMessageText, jsonMsg);

                sendEvent('raw_message', {
                    rawText: rawMessageText,
                    json: jsonMsg
                });

                if (process.send && rawMessageText.trim()) {
                    process.send({
                        type: 'viewer:chat',
                        payload: {
                            rawText: rawMessageText,
                            timestamp: Date.now()
                        }
                    });
                }
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

            bot.on('whisper', (username, message) => {
                if (messageHandledByCustomParser) return;
                handleIncomingCommand('whisper', username, message);
            });

            bot.on('userAction', async ({ action, target, ...data }) => {
                if (!target) return;

                try {
                    switch (action) {
                        case 'addGroup':
                            if (data.group) {
                                await bot.api.performUserAction(target, 'addGroup', { group: data.group });
                            }
                            break;
                        case 'removeGroup':
                            if (data.group) {
                                await bot.api.performUserAction(target, 'removeGroup', { group: data.group });
                            }
                            break;
                    }
                } catch (error) {
                    sendLog(`Ошибка при обработке userAction: ${error.message}`);
                }
            });

            bot.on('login', () => {
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }
                sendLog('[Event: login] Успешно залогинился!');
                if (process.send && !botReadySent) {
                    process.send({ type: 'bot_ready' });
                    process.send({ type: 'status', status: 'running' });
                    botReadySent = true;
                }
            });

            bot.on('death', () => {
                sendEvent('botDied', { user: { username: bot.username } });
            });

            bot.on('health', () => {
                sendEvent('health', {
                    health: bot.health,
                    food: bot.food,
                    saturation: bot.foodSaturation
                });
            });

            bot.on('kicked', (reason) => {
                let reasonText;
                try { reasonText = JSON.parse(reason).text || reason; } catch (e) { reasonText = reason; }
                sendLog(`[Event: kicked] Меня кикнули. Причина: ${reasonText}.`);
                process.exit(0);
            });

            bot.on('error', (err) => {
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }
                sendLog(`[Event: error] Произошла ошибка: ${err.stack || err.message}`);
            });

            bot.on('end', (reason) => {
                if (connectionTimeout) {
                    clearTimeout(connectionTimeout);
                    connectionTimeout = null;
                }
                const restartableReasons = ['socketClosed', 'keepAliveError'];
                const exitCode = restartableReasons.includes(reason) ? 1 : 0;

                sendLog(`[Event: end] Отключен от сервера. Причина: ${reason}`);
                process.exit(exitCode);
            });

            bot.on('playerJoined', (player) => {
                if (!isReady) return;
                sendEvent('playerJoined', { user: { username: player.username, uuid: player.uuid } });
            });

            bot.on('playerLeft', (player) => {
                if (!isReady) return;
                sendEvent('playerLeft', { user: { username: player.username, uuid: player.uuid } });
            });

            bot.on('entitySpawn', (entity) => {
                if (!isReady) return;
                const serialized = serializeEntity(entity);
                sendEvent('entitySpawn', { entity: serialized });
            });

            bot.on('entityMoved', (entity) => {
                if (!isReady) return;
                const now = Date.now();
                const lastSent = entityMoveThrottles.get(entity.id);
                if (!lastSent || now - lastSent > 500) {
                    entityMoveThrottles.set(entity.id, now);
                    sendEvent('entityMoved', { entity: serializeEntity(entity) });
                }
            });

            bot.on('entityGone', (entity) => {
                if (!isReady) return;
                sendEvent('entityGone', { entity: serializeEntity(entity) });
                entityMoveThrottles.delete(entity.id);
            });

            bot.on('spawn', () => {
                try {
                    if (bot._client && bot._client.options) {
                        bot._client.options.chat = 'enabled';
                    }
                    if (bot.chatEnabled !== undefined) {
                        bot.chatEnabled = true;
                    }
                } catch (err) {
                }
                setTimeout(() => {
                    isReady = true;
                }, 3000);

                // Отправка события для viewer
                if (process.send) {
                    process.send({
                        type: 'viewer:spawn',
                        payload: {
                            position: bot.entity?.position,
                            yaw: bot.entity?.yaw,
                            pitch: bot.entity?.pitch
                        }
                    });
                }
            });

            bot.on('health', () => {
                if (process.send) {
                    process.send({
                        type: 'viewer:health',
                        payload: {
                            health: bot.health,
                            food: bot.food
                        }
                    });
                }
            });

            bot.on('move', () => {
                if (process.send) {
                    process.send({
                        type: 'viewer:move',
                        payload: {
                            position: bot.entity?.position,
                            yaw: bot.entity?.yaw,
                            pitch: bot.entity?.pitch
                        }
                    });
                }
            });
        } catch (err) {
            sendLog(`[CRITICAL] Критическая ошибка при создании бота: ${err.stack}`);
            process.exit(1);
        }
    } else if (message.type === 'config:reload') {
        sendLog('[System] Received config:reload command. Reloading configuration...');
        try {
            const newConfig = await fetchNewConfig(bot.config.id, prisma);
            if (newConfig) {
                console.log(`[DEBUG BotProcess] Before reload - owners: "${bot.config.owners}"`);
                bot.config = { ...bot.config, ...newConfig };
                console.log(`[DEBUG BotProcess] After reload - owners: "${bot.config.owners}"`);
                const newCommands = await loadCommands();
                const newPlugins = bot.config.plugins;
                bot.commands = newCommands;
                await initializePlugins(bot, newPlugins, prisma);
                sendLog('[System] Bot configuration and plugins reloaded successfully.');
            } else {
                sendLog('[System] Failed to fetch new configuration.');
            }
        } catch (error) {
            sendLog(`[System] Error reloading configuration: ${error.message}`);
        }
    } else if (message.type === 'stop') {
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
        }
        botReadySent = false;
        if (bot) bot.quit();
        else process.exit(0);
    } else if (message.type === 'chat') {
        if (bot && bot.entity) {
            const { message: msg, chatType, username } = message.payload;
            bot.messageQueue.enqueue(chatType, msg, username);
        }
    } else if (message.type === 'register_temp_command') {
        // Регистрация временной команды из главного процесса
        const { commandData } = message;

        try {
            const tempCommand = new Command({
                name: commandData.name,
                description: commandData.description || '',
                aliases: commandData.aliases || [],
                cooldown: commandData.cooldown || 0,
                allowedChatTypes: commandData.allowedChatTypes || ['chat', 'private'],
                args: [],
                owner: 'runtime',
            });

            tempCommand.permissionId = commandData.permissionId || null;
            tempCommand.isTemporary = true;
            tempCommand.tempId = commandData.tempId;
            tempCommand.isVisual = false;
            tempCommand.handler = () => { };

            // Регистрируем команду в bot.commands
            bot.commands.set(commandData.name, tempCommand);

            if (Array.isArray(commandData.aliases)) {
                for (const alias of commandData.aliases) {
                    bot.commands.set(alias, tempCommand);
                }
            }
        } catch (error) {
            sendLog(`[BotProcess] Ошибка регистрации временной команды: ${error.message}`);
        }
    } else if (message.type === 'unregister_temp_command') {
        const { commandName, aliases } = message;

        try {
            if (bot.commands.has(commandName)) {
                bot.commands.delete(commandName);
            }

            if (Array.isArray(aliases)) {
                for (const alias of aliases) {
                    if (bot.commands.has(alias)) {
                        bot.commands.delete(alias);
                    }
                }
            }
        } catch (error) {
            sendLog(`[BotProcess] Ошибка удаления временной команды: ${error.message}`);
        }
    } else if (message.type === 'execute_handler') {
        const { commandName, username, args, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            (async () => {
                try {
                    const user = await UserService.getUser(username, bot.config.id, bot.config);

                    const handlerParamCount = commandInstance.handler.length;

                    if (handlerParamCount === 1) {
                        const transport = new Transport(typeChat, bot);
                        const context = new CommandContext(bot, user, args, transport);
                        await commandInstance.handler(context);
                    } else {
                        await commandInstance.handler(bot, typeChat, user, args);
                    }
                } catch (e) {
                    sendLog(`[Handler Error] Ошибка в handler-е команды ${commandName}: ${e.message}`);
                    sendLog(`[Handler Error] Stack trace: ${e.stack}`);
                }
            })();
        }
    } else if (message.type === 'execute_command_request') {
        const { requestId, payload } = message;
        const { commandName, args, username, typeChat } = payload;

        (async () => {
            try {
                const commandInstance = bot.commands.get(commandName);
                if (!commandInstance) {
                    throw new Error(`Command '${commandName}' not found.`);
                }

                const user = await UserService.getUser(username, bot.config.id, bot.config);

                let result;

                const handlerParamCount = commandInstance.handler.length;

                if (handlerParamCount === 1) {
                    const transport = new Transport(typeChat, bot);
                    const context = new CommandContext(bot, user, args, transport);

                    if (typeChat === 'websocket') {
                        result = await commandInstance.handler(context);
                        if (process.send) {
                            process.send({ type: 'execute_command_response', requestId, result });
                        }
                    } else {
                        commandInstance.handler(context).catch(e => {
                            sendLog(`[Handler Error] Ошибка в handler-е команды ${commandName}: ${e.message}`);
                        });
                    }
                } else {
                    // Старая сигнатура: handler(bot, typeChat, user, args)
                    if (typeChat === 'websocket') {
                        // Для websocket перехватываем bot.sendMessage
                        const originalSendMessage = bot.sendMessage;
                        let resultFromSendMessage = null;
                        let sendMessageCalled = false;

                        bot.sendMessage = (type, message, username) => {
                            if (type === 'websocket') {
                                resultFromSendMessage = message;
                                sendMessageCalled = true;
                            } else {
                                originalSendMessage.call(bot, type, message, username);
                            }
                        };

                        try {
                            const returnValue = await commandInstance.handler(bot, typeChat, user, args);
                            result = sendMessageCalled ? resultFromSendMessage : returnValue;

                            if (process.send) {
                                process.send({ type: 'execute_command_response', requestId, result });
                            }
                        } finally {
                            bot.sendMessage = originalSendMessage;
                        }
                    } else {
                        // Для игровых команд просто выполняем
                        commandInstance.handler(bot, typeChat, user, args).catch(e => {
                            sendLog(`[Handler Error] Ошибка в handler-е команды ${commandName}: ${e.message}`);
                        });
                    }
                }

            } catch (error) {
                if (process.send) {
                    process.send({ type: 'execute_command_response', requestId, error: error.message });
                }
            }
        })();
    } else if (message.type === 'invalidate_user_cache') {
        if (message.username && bot && bot.config) {
            UserService.clearCache(message.username, bot.config.id);
        }
    } else if (message.type === 'invalidate_all_user_cache') {
        if (bot && bot.config) {
            for (const [cacheKey, user] of UserService.cache.entries()) {
                if (cacheKey.startsWith(`${bot.config.id}:`)) {
                    UserService.cache.delete(cacheKey);
                }
            }
            sendLog(`[BotProcess] Кэш пользователей очищен для бота ${bot.config.id}`);
        }
    } else if (message.type === 'handle_permission_error') {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onInsufficientPermissions !== Command.prototype.onInsufficientPermissions) {
                commandInstance.onInsufficientPermissions(bot, typeChat, { username });
            } else {
                bot.api.sendMessage(typeChat, `У вас нет прав для выполнения команды ${commandName}.`, username);
            }
        }
    } else if (message.type === 'handle_wrong_chat') {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onWrongChatType !== Command.prototype.onWrongChatType) {
                commandInstance.onWrongChatType(bot, typeChat, { username });
            } else {
                bot.api.sendMessage('private', `Команду ${commandName} нельзя использовать в этом типе чата - ${typeChat}.`, username);
            }
        }
    } else if (message.type === 'handle_cooldown') {
        const { commandName, username, typeChat, timeLeft } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onCooldown !== Command.prototype.onCooldown) {
                commandInstance.onCooldown(bot, typeChat, { username }, timeLeft);
            } else {
                bot.api.sendMessage(typeChat, `Команду ${commandName} можно будет использовать через ${timeLeft} сек.`, username);
            }
        }
    } else if (message.type === 'handle_blacklist') {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onBlacklisted !== Command.prototype.onBlacklisted) {
                commandInstance.onBlacklisted(bot, typeChat, { username });
            }
        }
    } else if (message.type === 'action') {
        if (message.name === 'lookAt' && bot && message.payload.position) {
            const { x, y, z } = message.payload.position;
            if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
                bot.lookAt(new Vec3(x, y, z));
            } else {
                sendLog(`[BotProcess] Ошибка lookAt: получены невалидные координаты: ${JSON.stringify(message.payload.position)}`);
            }
        }
    } else if (message.type === 'plugins:reload') {
        sendLog('[System] Получена команда на перезагрузку плагинов...');
        const newConfig = await fetchNewConfig(bot.config.id, prisma);
        if (newConfig) {
            bot.config.plugins = newConfig.installedPlugins;
            bot.commands.clear();
            await loadCommands(bot, newConfig.commands);
            await initializePlugins(bot, newConfig.installedPlugins, prisma);
            sendLog('[System] Плагины успешно перезагружены.');
        } else {
            sendLog('[System] Не удалось получить новую конфигурацию для перезагрузки плагинов.');
        }
    } else if (message.type === 'server_command') {
        if (bot && bot.messageQueue && message.payload && message.payload.command) {
            bot.messageQueue.enqueue('command', message.payload.command);
        }
    } else if (message.type === 'execute_event_graph') {
        // Выполнение event графа в child process
        const { graph, eventType, eventArgs } = message;

        try {
            if (!graph || !graph.nodes || graph.nodes.length === 0) {
                return;
            }

            const config = bot?.config || bot?.botConfig || message.botConfig;

            if (!config) {
                sendLog('[ERROR] Bot config not available for event graph execution');
                return;
            }

            const botApi = {
                sendMessage: (chatType, messageText, recipient) => {
                    if (!bot || !bot.messageQueue) return;
                    bot.messageQueue.enqueue(chatType, messageText, recipient);
                },
                executeCommand: (command) => {
                    if (!bot || !bot.messageQueue) return;
                    bot.messageQueue.enqueue('command', command);
                },
                lookAt: async (x, y, z) => {
                    if (!bot) return;
                    const target = new Vec3(x, y, z);
                    await bot.lookAt(target);
                },
                navigate: async (x, y, z) => {
                    if (!bot || !bot.pathfinder) return;
                    const goal = new (require('mineflayer-pathfinder').goals.GoalBlock)(x, y, z);
                    await bot.pathfinder.goto(goal);
                },
                attack: (entityId) => {
                    if (!bot) return;
                    const entity = bot.entities[entityId];
                    if (entity) bot.attack(entity);
                },
                follow: (username) => {
                    if (!bot || !bot.pathfinder) return;
                    const player = bot.players[username];
                    if (player && player.entity) {
                        const goal = new (require('mineflayer-pathfinder').goals.GoalFollow)(player.entity, 3);
                        bot.pathfinder.setGoal(goal, true);
                    }
                },
                stopFollow: () => {
                    if (bot && bot.pathfinder) {
                        bot.pathfinder.setGoal(null);
                    }
                }
            };

            const players = bot ? Object.keys(bot.players) : [];

            const context = {
                bot: botApi,
                players,
                botState: {
                    health: bot?.health,
                    food: bot?.food,
                    position: bot?.entity?.position
                },
                botEntity: bot && bot.entity ? {
                    position: bot.entity.position,
                    velocity: bot.entity.velocity,
                    yaw: bot.entity.yaw,
                    pitch: bot.entity.pitch,
                    onGround: bot.entity.onGround,
                    height: bot.entity.height,
                    width: bot.entity.width
                } : null,
                eventArgs,
                botId: config.id,
                graphId: graph.id,
                eventType: eventType,
                eventArgs: eventArgs
            };

            const engine = new GraphExecutionEngine(NodeRegistry, botApi);

            await engine.execute(graph, context, eventType);

        } catch (error) {
            sendLog(`[ERROR] Error executing event graph for '${eventType}': ${error.message}`);
            console.error(error);
        }
    }
});

process.on('unhandledRejection', (reason, promise) => {
    const errorMsg = `[FATAL] Необработанная ошибка процесса: ${reason?.stack || reason}`;
    sendLog(errorMsg);
    setTimeout(() => process.exit(1), 100);
});

process.on('uncaughtException', (error) => {
    const errorMsg = `[FATAL] Необработанное исключение: ${error.stack || error.message}`;
    sendLog(errorMsg);
    setTimeout(() => process.exit(1), 100);
});

process.on('SIGTERM', () => {
    sendLog('[System] Получен сигнал SIGTERM. Завершение работы...');
    if (bot) {
        try {
            bot.quit();
        } catch (error) {
            sendLog(`[System] Ошибка при корректном завершении бота: ${error.message}`);
        }
    }
    setTimeout(() => process.exit(0), 100);
});

process.on('SIGINT', () => {
    sendLog('[System] Получен сигнал SIGINT. Завершение работы...');
    if (bot) {
        try {
            bot.quit();
        } catch (error) {
            sendLog(`[System] Ошибка при корректном завершении бота: ${error.message}`);
        }
    }
    setTimeout(() => process.exit(0), 100);
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

