const { MessageTypes } = require('./ipc/ipcMessageTypes');
const { Vec3 } = require('vec3');
const { v4: uuidv4 } = require('uuid');
const { parseArguments } = require('./system/parseArguments');
const { getRuntimeCommandRegistry } = require('./system/RuntimeCommandRegistry');
const Transport = require('./system/Transport');
const CommandContext = require('./system/CommandContext');
const UserService = require('./UserService');
const GraphExecutionEngine = require('./GraphExecutionEngine');
const NodeRegistry = require('./NodeRegistry');
const Command = require('./system/Command');

let viewerRenderDistance = 24;

function createSendLog() {
    return process.send
        ? (content) => process.send({ type: MessageTypes.BOT.LOG, content })
        : (content) => console.log(`[ChildProcess Log] ${content}`);
}

function handleIncomingCommand(bot, type, username, message, sendLog) {
    const log = sendLog || createSendLog();

    if (!message.startsWith(bot.config.prefix || '@')) return;

    const rawMessage = message.slice((bot.config.prefix || '@').length).trim();
    const commandParts = rawMessage.split(/ +/);
    const commandName = commandParts.shift().toLowerCase();
    const restOfMessage = commandParts.join(' ');

    let commandInstance = bot.commands.get(commandName) ||
        Array.from(bot.commands.values()).find(cmd => cmd.aliases.includes(commandName));

    if (!commandInstance) {
        const runtimeRegistry = getRuntimeCommandRegistry();
        commandInstance = runtimeRegistry.get(bot.config.id, commandName);
    }

    if (!commandInstance) return;

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
                        bot.api.sendMessage(type, `Ошибка: Аргумент "${argDef.description}" должен быть числом.`, username);
                        return;
                    }
                    value = numValue;
                }
                processedArgs[argDef.name] = value;
                currentArgIndex++;
            }

            if (processedArgs[argDef.name] === undefined) {
                if (argDef.default !== undefined) {
                    processedArgs[argDef.name] = argDef.default;
                }
            }
        }

        if (process.send) {
            process.send({
                type: MessageTypes.COMMAND.VALIDATE_AND_RUN,
                commandName: commandInstance.name,
                username,
                args: processedArgs,
                typeChat: type,
                commandArgs: argsDef
            });
        }
    } catch (e) {
        log(`[BotProcess] Ошибка парсинга аргументов: ${e.message}`);
    }
}

function createBotIPCHandler(bot, prisma, pluginUiState, pendingRequests, sendLog, sendEvent, serializeEntity) {
    const handlers = {};

    handlers[MessageTypes.BOT.START] = async (message) => {
        const config = message.config;
        sendLog(`[System] Получена команда на запуск бота ${config.username}...`);
        return { config };
    };

    handlers[MessageTypes.SYSTEM.GET_PLAYER_LIST] = (message) => {
        const playerList = bot ? Object.keys(bot.players) : [];
        return { requestId: message.requestId, players: playerList };
    };

    handlers[MessageTypes.SYSTEM.GET_NEARBY_ENTITIES] = (message) => {
        const entities = [];
        if (bot && bot.entities) {
            const centerPos = message.payload?.position || bot.entity?.position;
            const radius = message.payload?.radius || 32;

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
        return { requestId: message.requestId, entities };
    };

    handlers[MessageTypes.VIEWER.GET_STATE] = (message) => {
        if (!bot || !process.send) return null;

        let blocks = undefined;
        if (message.includeBlocks && bot.entity?.position) {
            blocks = [];
            const pos = bot.entity.position;

            for (let x = Math.floor(pos.x - viewerRenderDistance); x <= Math.floor(pos.x + viewerRenderDistance); x++) {
                for (let y = Math.floor(pos.y - viewerRenderDistance / 2); y <= Math.floor(pos.y + viewerRenderDistance); y++) {
                    for (let z = Math.floor(pos.z - viewerRenderDistance); z <= Math.floor(pos.z + viewerRenderDistance); z++) {
                        const block = bot.blockAt(new Vec3(x, y, z));
                        if (block && block.type !== 0) {
                            blocks.push({ x, y, z, type: block.type, name: block.name });
                        }
                    }
                }
            }
        }

        return {
            requestId: message.requestId,
            state: {
                status: bot._client ? 'online' : 'offline',
                health: bot.health || 20,
                food: bot.food || 20,
                position: bot.entity?.position ? { x: bot.entity.position.x, y: bot.entity.position.y, z: bot.entity.position.z } : null,
                yaw: bot.entity?.yaw || 0,
                pitch: bot.entity?.pitch || 0,
                gameMode: bot.game?.gameMode,
                dimension: bot.game?.dimension,
                blocks,
                inventory: bot.inventory ? bot.inventory.items().map(item => ({ name: item.name, displayName: item.displayName, count: item.count, slot: item.slot })) : [],
                nearbyPlayers: bot.entities ? Object.values(bot.entities).filter(e => e.type === 'player' && e.username !== bot.username).map(e => ({ username: e.username, position: { x: e.position.x, y: e.position.y, z: e.position.z }, yaw: e.yaw || 0, pitch: e.pitch || 0, distance: bot.entity ? bot.entity.position.distanceTo(e.position) : 0 })) : [],
                nearbyMobs: bot.entities ? Object.values(bot.entities).filter(e => e.type === 'mob').map(e => ({ name: e.name || e.displayName, mobType: e.mobType, position: { x: e.position.x, y: e.position.y, z: e.position.z }, distance: bot.entity ? bot.entity.position.distanceTo(e.position) : 0 })) : []
            }
        };
    };

    handlers[MessageTypes.VIEWER.CONTROL] = (message) => {
        if (!bot) return null;
        const { command } = message;

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
            case 'hotbar_slot':
                if (command.slot !== undefined && command.slot >= 0 && command.slot <= 8) {
                    bot.setQuickBarSlot(command.slot);
                    sendLog(`[Viewer] Hotbar slot changed to ${command.slot}`);
                }
                break;
            case 'place':
                if (command.position && command.blockType) {
                    const referenceBlock = bot.blockAt(new Vec3(command.position.x, command.position.y, command.position.z));
                    if (referenceBlock) {
                        const itemToPlace = bot.inventory.items().find(item => item.name === command.blockType);
                        if (itemToPlace) {
                            bot.equip(itemToPlace, 'hand').then(() => bot.placeBlock(referenceBlock, new Vec3(0, 1, 0))).catch(err => sendLog(`[Viewer] Place error: ${err.message}`));
                        }
                    }
                }
                break;
            case 'set_render_distance':
                if (command.distance && command.distance >= 8 && command.distance <= 64) {
                    viewerRenderDistance = command.distance;
                    sendLog(`[Viewer] Render distance set to ${viewerRenderDistance}`);
                }
                break;
            case 'click_window':
                if (bot.currentWindow && command.slot !== undefined) {
                    const mouseButton = command.mouseButton ?? 0;
                    const mode = command.mode ?? 0;
                    bot.clickWindow(command.slot, mouseButton, mode)
                        .catch(err => sendLog(`[Viewer] clickWindow error: ${err.message}`));
                }
                break;
            case 'close_window':
                if (bot.currentWindow) {
                    try { bot.closeWindow(bot.currentWindow); }
                    catch (e) { sendLog(`[Viewer] closeWindow error: ${e.message}`); }
                }
                break;
            case 'drop_item': {
                try {
                    const heldItem = bot.heldItem;
                    if (heldItem) {
                        const count = command.full ? heldItem.count : 1;
                        bot.toss(heldItem.type, heldItem.metadata, count)
                            .catch(err => sendLog(`[Viewer] Drop error: ${err.message}`));
                    }
                } catch (e) { sendLog(`[Viewer] drop_item: ${e.message}`); }
                break;
            }
            case 'swap_hands': {
                try {
                    if (typeof bot.swapHands === 'function') {
                        bot.swapHands().catch(err => sendLog(`[Viewer] swap_hands error: ${err.message}`));
                    } else if (bot._client) {
                        bot._client.write('block_dig', { status: 6, location: bot.entity.position, face: 0 });
                    }
                } catch (e) { sendLog(`[Viewer] swap_hands: ${e.message}`); }
                break;
            }
            case 'use_item': {
                try {
                    bot.activateItem(command.offHand === true);
                } catch (e) { sendLog(`[Viewer] use_item: ${e.message}`); }
                break;
            }
            case 'attack_entity': {
                try {
                    if (command.entityId && bot.entities[command.entityId]) {
                        bot.attack(bot.entities[command.entityId]);
                    }
                } catch (e) { sendLog(`[Viewer] attack_entity: ${e.message}`); }
                break;
            }
            case 'place_block': {
                try {
                    if (command.position && command.face) {
                        const ref = bot.blockAt(new Vec3(command.position.x, command.position.y, command.position.z));
                        if (ref) {
                            const faceVec = new Vec3(command.face.x || 0, command.face.y || 0, command.face.z || 0);
                            bot.placeBlock(ref, faceVec).catch(err => sendLog(`[Viewer] place_block: ${err.message}`));
                        }
                    }
                } catch (e) { sendLog(`[Viewer] place_block: ${e.message}`); }
                break;
            }
            case 'activate_block': {
                try {
                    if (command.position) {
                        const block = bot.blockAt(new Vec3(command.position.x, command.position.y, command.position.z));
                        if (block) bot.activateBlock(block).catch(err => sendLog(`[Viewer] activate_block: ${err.message}`));
                    }
                } catch (e) { sendLog(`[Viewer] activate_block: ${e.message}`); }
                break;
            }
            case 'open_inventory': {
                if (process.send && bot.inventory) {
                    try {
                        const slots = (bot.inventory.slots || []).map((item, idx) => {
                            if (!item) return { slot: idx, empty: true };
                            return { slot: idx, name: item.name, displayName: item.displayName, count: item.count, type: item.type };
                        });
                        process.send({
                            type: 'viewer:windowOpen',
                            payload: { id: 0, type: 'inventory', title: 'Inventory', slotCount: slots.length || 46, slots, isPlayerInventory: true }
                        });
                    } catch (e) { sendLog(`[Viewer] open_inventory: ${e.message}`); }
                }
                break;
            }
            case 'sneak_toggle':
                bot.setControlState('sneak', !!command.active);
                break;
        }
        return null;
    };

    handlers[MessageTypes.GRAPH.EXECUTE_EVENT_GRAPH] = async (message) => {
        const { graph, eventType, eventArgs } = message;
        if (!graph || !graph.nodes || graph.nodes.length === 0) return null;

        const config = bot?.config;
        if (!config) {
            sendLog('[ERROR] Bot config not available for event graph execution');
            return null;
        }

        const players = bot ? Object.keys(bot.players) : [];

        const context = {
            bot,
            players,
            botState: { health: bot?.health, food: bot?.food, position: bot?.entity?.position },
            botEntity: bot && bot.entity ? serializeEntity(bot.entity) : null,
            eventArgs,
            botId: config.id,
            graphId: graph.id,
            eventType
        };

        const engine = new GraphExecutionEngine(NodeRegistry, bot);
        await engine.execute(graph, context, eventType);

        return null;
    };

    handlers[MessageTypes.USER.ACTION_RESPONSE] = (message) => {
        if (pendingRequests.has(message.requestId)) {
            const { resolve, reject } = pendingRequests.get(message.requestId);
            if (message.error) reject(new Error(message.error));
            else resolve(message.payload);
            pendingRequests.delete(message.requestId);
        }
        return null;
    };

    handlers[MessageTypes.USER.CREDENTIALS_OPERATION_RESPONSE] = (message) => {
        if (pendingRequests.has(message.requestId)) {
            const { resolve, reject } = pendingRequests.get(message.requestId);
            if (message.error) reject(new Error(message.error));
            else resolve(message.payload);
            pendingRequests.delete(message.requestId);
        }
        return null;
    };

    handlers[MessageTypes.COMMAND.EXECUTE_HANDLER] = (message) => {
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
                    sendLog(`[Handler Error] ${commandName}: ${e.message}`);
                }
            })();
        }
        return null;
    };

    handlers[MessageTypes.COMMAND.EXECUTE_COMMAND_REQUEST] = (message) => {
        const { requestId, payload } = message;
        const { commandName, args, username, typeChat } = payload;

        (async () => {
            try {
                const commandInstance = bot.commands.get(commandName);
                if (!commandInstance) throw new Error(`Command '${commandName}' not found.`);

                const user = await UserService.getUser(username, bot.config.id, bot.config);
                const handlerParamCount = commandInstance.handler.length;

                let result;
                if (handlerParamCount === 1) {
                    const transport = new Transport(typeChat, bot);
                    const context = new CommandContext(bot, user, args, transport);

                    if (typeChat === 'websocket') {
                        result = await commandInstance.handler(context);
                        if (process.send) process.send({ type: MessageTypes.GRAPH.EXECUTE_COMMAND_RESPONSE, requestId, result });
                    } else {
                        commandInstance.handler(context).catch(e => sendLog(`[Handler Error] ${commandName}: ${e.message}`));
                    }
                } else {
                    if (typeChat === 'websocket') {
                        const originalSendMessage = bot.sendMessage;
                        let resultFromSendMessage = null;
                        let sendMessageCalled = false;

                        bot.sendMessage = (type, msg, user) => {
                            if (type === 'websocket') {
                                resultFromSendMessage = msg;
                                sendMessageCalled = true;
                            } else {
                                originalSendMessage.call(bot, type, msg, user);
                            }
                        };

                        try {
                            const returnValue = await commandInstance.handler(bot, typeChat, user, args);
                            result = sendMessageCalled ? resultFromSendMessage : returnValue;
                            if (process.send) process.send({ type: MessageTypes.GRAPH.EXECUTE_COMMAND_RESPONSE, requestId, result });
                        } finally {
                            bot.sendMessage = originalSendMessage;
                        }
                    } else {
                        commandInstance.handler(bot, typeChat, user, args).catch(e => sendLog(`[Handler Error] ${commandName}: ${e.message}`));
                    }
                }
            } catch (error) {
                if (process.send) process.send({ type: MessageTypes.GRAPH.EXECUTE_COMMAND_RESPONSE, requestId, error: error.message });
            }
        })();
        return null;
    };

    handlers[MessageTypes.COMMAND.HANDLE_PERMISSION_ERROR] = (message) => {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onInsufficientPermissions !== Command.prototype.onInsufficientPermissions) {
                commandInstance.onInsufficientPermissions(bot, typeChat, { username });
            } else {
                bot.api.sendMessage(typeChat, `У вас нет прав для выполнения команды ${commandName}.`, username);
            }
        }
        return null;
    };

    handlers[MessageTypes.COMMAND.HANDLE_WRONG_CHAT] = (message) => {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onWrongChatType !== Command.prototype.onWrongChatType) {
                commandInstance.onWrongChatType(bot, typeChat, { username });
            } else {
                bot.api.sendMessage('private', `Команду ${commandName} нельзя использовать в этом типе чата - ${typeChat}.`, username);
            }
        }
        return null;
    };

    handlers[MessageTypes.COMMAND.HANDLE_COOLDOWN] = (message) => {
        const { commandName, username, typeChat, timeLeft } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onCooldown !== Command.prototype.onCooldown) {
                commandInstance.onCooldown(bot, typeChat, { username }, timeLeft);
            } else {
                bot.api.sendMessage(typeChat, `Команду ${commandName} можно будет использовать через ${timeLeft} сек.`, username);
            }
        }
        return null;
    };

    handlers[MessageTypes.COMMAND.HANDLE_BLACKLIST] = (message) => {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance && commandInstance.onBlacklisted !== Command.prototype.onBlacklisted) {
            commandInstance.onBlacklisted(bot, typeChat, { username });
        }
        return null;
    };

    handlers[MessageTypes.CHAT.SEND_MESSAGE] = (message) => {
        const { typeChat, message: msg, username } = message;
        if (bot && bot.api) {
            bot.api.sendMessage(typeChat, msg, username);
        }
        return null;
    };

    handlers[MessageTypes.PLUGINS.RELOAD] = async () => {
        sendLog('[System] Получена команда на перезагрузку плагинов...');
        return { shouldReload: true };
    };

    handlers[MessageTypes.SERVER.COMMAND] = (message) => {
        if (bot && bot.messageQueue && message.payload?.command) {
            bot.messageQueue.enqueue('command', message.payload.command);
        }
        return null;
    };

    handlers[MessageTypes.USER.INVALIDATE_USER_CACHE] = (message) => {
        if (message.username && bot && bot.config) {
            UserService.clearCache(message.username, bot.config.id);
        }
        return null;
    };

    handlers[MessageTypes.USER.INVALIDATE_ALL_USER_CACHE] = () => {
        if (bot && bot.config) {
            for (const [cacheKey] of UserService.cache.entries()) {
                if (cacheKey.startsWith(`${bot.config.id}:`)) {
                    UserService.cache.delete(cacheKey);
                }
            }
            sendLog(`[BotProcess] Кэш пользователей очищен для бота ${bot.config.id}`);
        }
        return null;
    };

    return handlers;
}

function sendLog(content) {
    if (process.send) {
        process.send({ type: MessageTypes.BOT.LOG, content });
    } else {
        console.log(`[ChildProcess Log] ${content}`);
    }
}

module.exports = {
    handleIncomingCommand,
    createBotIPCHandler,
    sendLog
};
