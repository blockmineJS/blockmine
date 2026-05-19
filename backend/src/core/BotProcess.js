const mineflayer = require('mineflayer');
const { SocksClient } = require('socks');
const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const { Vec3 } = require('vec3');
const { PrismaClient } = require('@prisma/client');
const { loadCommands } = require('./system/CommandRegistry');
const { getRuntimeCommandRegistry } = require('./system/RuntimeCommandRegistry');
const { initializePlugins, ensurePluginDependencies } = require('./PluginLoader');
const MessageQueue = require('./MessageQueue');
const Command = require('./system/Command');
const { parseArguments } = require('./system/parseArguments');
const GraphExecutionEngine = require('./GraphExecutionEngine');
const NodeRegistry = require('./NodeRegistry');
const { createBotApi } = require('./ipc/botApiFactory');
const { MessageTypes, EventTypes } = require('./ipc/ipcMessageTypes');

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
let viewerSubscriberCount = 0; // Сколько socket.io клиентов смотрят этого бота
const viewerSnapshotControl = {
    startSnapshot: null,
    stopSnapshot: null,
    // Расширенные broadcaster'ы — для использования в VIEWER.CONTROL case'ах
    // (request_player_list / request_scoreboard). Set после bot.spawn.
    broadcastPlayerList: null,
    broadcastScoreboard: null,
};
let viewerVirtualInventoryOpen = false; // Открыто ли наше виртуальное E-окно
                                        // (mineflayer не открывает реальное окно для player inventory)

/**
 * Сериализует equipment чужого игрока для viewer.
 * mineflayer.Entity.equipment — массив длины 6:
 *   [0] = main hand (held item)
 *   [1] = off hand
 *   [2] = boots
 *   [3] = leggings
 *   [4] = chestplate
 *   [5] = helmet
 * (см. https://prismarinejs.github.io/mineflayer/docs/api.html — entity.equipment)
 */
function serializePlayerEquipment(entity) {
    if (!entity || !entity.equipment) return null;
    const eq = entity.equipment;
    const slotName = (item) => item ? item.name : null;
    // Поддерживаем оба формата: array (старый mineflayer) и object
    if (Array.isArray(eq)) {
        return {
            mainHand:   slotName(eq[0]),
            offHand:    slotName(eq[1]),
            boots:      slotName(eq[2]),
            leggings:   slotName(eq[3]),
            chestplate: slotName(eq[4]),
            helmet:     slotName(eq[5]),
        };
    }
    return {
        mainHand:   slotName(eq.mainHand || eq.hand),
        offHand:    slotName(eq.offHand),
        boots:      slotName(eq.boots || eq.feet),
        leggings:   slotName(eq.leggings || eq.legs),
        chestplate: slotName(eq.chestplate || eq.chest),
        helmet:     slotName(eq.helmet || eq.head),
    };
}

// === Парсеры NBT/data-components для item display (module-level) ===
// Те же функции используются ВНУТРИ замыкания bot start (там определены копии).
// Здесь они доступны для buildPlayerInventoryPayload, чтобы инвентарь игрока
// (виртуальное окно от клавиши E) тоже содержал customName/lore/metadata
// для корректных tooltip'ов в UI.
const _COLOR_TO_CODE = {
    black: '0', dark_blue: '1', dark_green: '2', dark_aqua: '3',
    dark_red: '4', dark_purple: '5', gold: '6', gray: '7',
    dark_gray: '8', blue: '9', green: 'a', aqua: 'b',
    red: 'c', light_purple: 'd', yellow: 'e', white: 'f',
};
function _parseTextComponent(comp) {
    if (!comp) return '';
    if (typeof comp === 'string') {
        try { return _parseTextComponent(JSON.parse(comp)); }
        catch (e) { return comp; }
    }
    let out = '';
    if (comp.color && _COLOR_TO_CODE[comp.color]) out += '§' + _COLOR_TO_CODE[comp.color];
    if (comp.bold) out += '§l';
    if (comp.italic) out += '§o';
    if (comp.underlined) out += '§n';
    if (comp.strikethrough) out += '§m';
    if (comp.obfuscated) out += '§k';
    if (typeof comp.text === 'string') out += comp.text;
    if (Array.isArray(comp.extra)) {
        for (const e of comp.extra) out += _parseTextComponent(e);
    }
    return out;
}
function _tryParseJson(v) {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
        try { return JSON.parse(t); } catch (e) { return v; }
    }
    return v;
}
function _extractItemDisplay(item) {
    if (!item) return { displayName: null, lore: [] };
    try {
        let displayName = null;
        let lore = [];
        if (item.customName != null) {
            displayName = _parseTextComponent(_tryParseJson(item.customName));
        }
        if (Array.isArray(item.customLore)) {
            lore = item.customLore.map(l => _parseTextComponent(_tryParseJson(l))).filter(Boolean);
        }
        const components = item.components || item.componentMap;
        if (components) {
            if (!displayName) {
                const cn = components['minecraft:custom_name']
                    ?? components['custom_name']
                    ?? components['minecraft:item_name']
                    ?? components['item_name'];
                if (cn != null) displayName = _parseTextComponent(_tryParseJson(cn));
            }
            if (lore.length === 0) {
                const cl = components['minecraft:lore'] ?? components['lore'];
                if (Array.isArray(cl)) {
                    lore = cl.map(l => _parseTextComponent(_tryParseJson(l))).filter(Boolean);
                } else if (cl?.lines && Array.isArray(cl.lines)) {
                    lore = cl.lines.map(l => _parseTextComponent(_tryParseJson(l))).filter(Boolean);
                }
            }
        }
        if (item.nbt) {
            const display = item.nbt?.value?.display?.value;
            if (display) {
                if (!displayName && display.Name?.value) {
                    displayName = _parseTextComponent(_tryParseJson(display.Name.value));
                }
                if (lore.length === 0 && Array.isArray(display.Lore?.value?.value)) {
                    lore = display.Lore.value.value
                        .map(l => _parseTextComponent(_tryParseJson(l)))
                        .filter(Boolean);
                }
            }
        }
        return { displayName, lore };
    } catch (e) {
        return { displayName: null, lore: [] };
    }
}

function buildPlayerInventoryPayload(bot) {
    const slots = (bot.inventory?.slots || []).map((item, idx) => {
        if (!item) return { slot: idx, empty: true };
        const { displayName: customName, lore } = _extractItemDisplay(item);
        return {
            slot: idx,
            name: item.name,
            displayName: item.displayName,
            customName,             // § coded — для tooltip
            lore,                   // массив строк с § кодами
            count: item.count,
            type: item.type,
            metadata: item.metadata,
            stackId: item.stackId,
            nbt: item.nbt ? true : false,
        };
    });
    return {
        id: 0,
        type: 'inventory',
        title: 'Inventory',
        slotCount: slots.length || 46,
        slots,
        isPlayerInventory: true,
    };
}

let __lastCpuUsage = process.cpuUsage();
let __lastCpuMeasureAt = Date.now();
const __resourceReporter = setInterval(() => {
    if (!process.send) return;
    try {
        const diff = process.cpuUsage(__lastCpuUsage);
        const now = Date.now();
        const elapsedMs = now - __lastCpuMeasureAt;
        const cpuMs = (diff.user + diff.system) / 1000;
        const cpuCores = require('os').cpus().length || 1;
        const cpuPercent = elapsedMs > 0
            ? Math.min(100, (cpuMs / (elapsedMs * cpuCores)) * 100)
            : 0;
        __lastCpuUsage = process.cpuUsage();
        __lastCpuMeasureAt = now;

        const memMb = process.memoryUsage().rss / 1024 / 1024;

        process.send({
            type: MessageTypes.BOT.RESOURCE_USAGE,
            cpu: parseFloat(cpuPercent.toFixed(1)),
            memory: parseFloat(memMb.toFixed(1)),
        });
    } catch (_) {}
}, 5000);
__resourceReporter.unref?.();

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
        process.send({ type: MessageTypes.BOT.LOG, content });
    } else {
        console.log(`[ChildProcess Log] ${content}`);
    }
}


function sendEvent(eventName, eventArgs) {
    if (process.send) {
        const enrichedArgs = {
            ...eventArgs,
            botEntity: bot && bot.entity ? {
                position: bot.entity.position,
                yaw: bot.entity.yaw,
                pitch: bot.entity.pitch
            } : null
        };
        process.send({ type: MessageTypes.BOT.EVENT, eventType: eventName, args: enrichedArgs });
    }
}

async function fetchNewConfig(botId, prisma) {
    try {
        const botData = await prisma.bot.findUnique({
            where: { id: botId },
            include: {
                server: true,
                proxy: true,
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
                // Не проверяем required здесь - это будет сделано в CommandExecutionService
                // после проверки типа чата и прав владельца
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
                commandArgs: argsDef // Передаем определение аргументов для валидации
            });
        }
    } catch (e) {
        sendLog(`[BotProcess] Ошибка парсинга аргументов: ${e.message}`);
    }
}

process.on('message', async (message) => {
    if (message.type === MessageTypes.PLUGIN.UI_START_UPDATES) {
        const { pluginName } = message;
        const state = pluginUiState.get(pluginName);
        if (state && process.send) {
            process.send({
                type: MessageTypes.PLUGIN.UI_DATA,
                plugin: pluginName,
                payload: state
            });
        }
    } else if (message.type === MessageTypes.USER.ACTION_RESPONSE) {
        if (pendingRequests.has(message.requestId)) {
            const { resolve, reject } = pendingRequests.get(message.requestId);
            if (message.error) {
                reject(new Error(message.error));
            } else {
                resolve(message.payload);
            }
            pendingRequests.delete(message.requestId);
        }
    } else if (message.type === MessageTypes.USER.CREDENTIALS_OPERATION_RESPONSE) {
        if (pendingRequests.has(message.requestId)) {
            const { resolve, reject } = pendingRequests.get(message.requestId);
            if (message.error) {
                reject(new Error(message.error));
            } else {
                resolve(message.payload);
            }
            pendingRequests.delete(message.requestId);
        }
    } else if (message.type === MessageTypes.SYSTEM.GET_PLAYER_LIST) {
        const playerList = bot ? Object.keys(bot.players) : [];
        if (process.send) {
            process.send({
                type: MessageTypes.SYSTEM.GET_PLAYER_LIST_RESPONSE,
                requestId: message.requestId,
                payload: { players: playerList }
            });
        }
    } else if (message.type === MessageTypes.SYSTEM.GET_NEARBY_ENTITIES) {
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
                type: MessageTypes.SYSTEM.GET_NEARBY_ENTITIES_RESPONSE,
                requestId: message.requestId,
                payload: { entities }
            });
        }
    } else if (message.type === 'viewer:subscribers_changed') {
        const prev = viewerSubscriberCount;
        viewerSubscriberCount = Math.max(0, Number(message.count) || 0);
        if (prev === 0 && viewerSubscriberCount > 0) {
            viewerSnapshotControl.startSnapshot?.();
        } else if (prev > 0 && viewerSubscriberCount === 0) {
            viewerSnapshotControl.stopSnapshot?.();
        }
    } else if (message.type === MessageTypes.VIEWER.GET_STATE) {
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
                username: bot.username || bot.config?.username || null,
                uuid: bot.player?.uuid || bot._client?.uuid || null,
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
                heldItem: bot.heldItem ? {
                    name: bot.heldItem.name,
                    displayName: bot.heldItem.displayName,
                    count: bot.heldItem.count,
                } : null,
                offHand: bot.inventory?.slots?.[45] ? {
                    name: bot.inventory.slots[45].name,
                    displayName: bot.inventory.slots[45].displayName,
                    count: bot.inventory.slots[45].count,
                } : null,
                armor: {
                    helmet:     bot.inventory?.slots?.[5]?.name || null,
                    chestplate: bot.inventory?.slots?.[6]?.name || null,
                    leggings:   bot.inventory?.slots?.[7]?.name || null,
                    boots:      bot.inventory?.slots?.[8]?.name || null,
                },
                nearbyPlayers: bot.entities ? Object.values(bot.entities)
                    .filter(e => e.type === 'player' && e.username !== bot.username)
                    .map(e => ({
                        id: e.id,
                        username: e.username,
                        uuid: e.uuid || bot.players?.[e.username]?.uuid || null,
                        position: { x: e.position.x, y: e.position.y, z: e.position.z },
                        yaw: e.yaw || 0,
                        pitch: e.pitch || 0,
                        distance: bot.entity ? bot.entity.position.distanceTo(e.position) : 0,
                        // Equipment: helmet/chestplate/leggings/boots/mainHand/offHand
                        // mineflayer хранит в entity.equipment как массив [mainHand, offHand, boots, leggings, chestplate, helmet]
                        // или объект — нормализуем
                        equipment: serializePlayerEquipment(e),
                    })) : [],
                nearbyMobs: bot.entities ? Object.values(bot.entities)
                    .filter(e => e.type === 'mob')
                    .map(e => ({
                        name: e.name || e.displayName,
                        // entity.mobType — deprecated в prismarine-entity, шлёт displayName
                        mobType: e.displayName,
                        position: { x: e.position.x, y: e.position.y, z: e.position.z },
                        distance: bot.entity ? bot.entity.position.distanceTo(e.position) : 0
                    })) : []
            };

            // currentWindow, playerList и scoreboard НЕ включаем в state-stream —
            // они шлются через отдельные события viewer:windowOpen/Update/Close,
            // viewer:playerList и viewer:scoreboard. Источник истины один, гонок нет.

            process.send({
                type: MessageTypes.VIEWER.STATE_RESPONSE,
                requestId: message.requestId,
                payload: state
            });
        }
    } else if (message.type === MessageTypes.VIEWER.CONTROL) {
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
                    // Старый одиночный dig — оставлен для обратной совместимости
                    if (command.position) {
                        const block = bot.blockAt(new Vec3(command.position.x, command.position.y, command.position.z));
                        if (block) bot.dig(block).catch(err => sendLog(`[Viewer] Dig error: ${err.message}`));
                    }
                    break;

                case 'start_dig':
                    // Hold-to-break: пользователь зажал ЛКМ.
                    // Запускаем dig и шлём периодически viewer:digProgress пока копаем.
                    if (command.position) {
                        const block = bot.blockAt(new Vec3(
                            command.position.x, command.position.y, command.position.z
                        ));
                        if (!block || block.type === 0) {
                            sendLog(`[Viewer] start_dig: no block at ${command.position.x},${command.position.y},${command.position.z}`);
                            break;
                        }
                        try {
                            // Отменяем предыдущий dig (если есть) и ждём чтобы не было race
                            if (bot.targetDigBlock) {
                                try { bot.stopDigging(); } catch (e) { /* ignore */ }
                            }
                            // Безопасный расчёт времени копания
                            let digTimeMs = 1000;
                            try {
                                if (typeof bot.digTime === 'function') {
                                    const t = bot.digTime(block.type);
                                    if (Number.isFinite(t) && t > 0) digTimeMs = t;
                                }
                            } catch (e) { /* ignore */ }

                            const startedAt = Date.now();
                            const digPos = { x: block.position.x, y: block.position.y, z: block.position.z };
                            let intervalActive = true;

                            // Сразу шлём progress=0 для мгновенной отрисовки overlay
                            if (process.send) {
                                process.send({
                                    type: 'viewer:digProgress',
                                    payload: { position: digPos, progress: 0, duration: digTimeMs }
                                });
                            }

                            // Прогресс по времени, НЕ зависит от bot.targetDigBlock
                            // (он устанавливается mineflayer'ом после await lookAt — лаг)
                            const progressInterval = setInterval(() => {
                                if (!intervalActive || !process.send) {
                                    clearInterval(progressInterval);
                                    return;
                                }
                                const elapsed = Date.now() - startedAt;
                                const progress = Math.min(0.99, elapsed / digTimeMs);
                                process.send({
                                    type: 'viewer:digProgress',
                                    payload: { position: digPos, progress, duration: digTimeMs }
                                });
                            }, 100);

                            bot.dig(block)
                                .then(() => {
                                    intervalActive = false;
                                    clearInterval(progressInterval);
                                    if (process.send) {
                                        process.send({
                                            type: 'viewer:digProgress',
                                            payload: { position: digPos, progress: 1, done: true }
                                        });
                                    }
                                })
                                .catch(err => {
                                    intervalActive = false;
                                    clearInterval(progressInterval);
                                    if (process.send) {
                                        process.send({
                                            type: 'viewer:digProgress',
                                            payload: { position: digPos, progress: 0, aborted: true }
                                        });
                                    }
                                    // 'aborted' не логируем — нормальный stop по mouseup
                                    const msg = err?.message || '';
                                    if (!msg.includes('aborted') && !msg.includes('Digging aborted')) {
                                        sendLog(`[Viewer] dig error: ${msg}`);
                                    }
                                });
                        } catch (e) {
                            sendLog(`[Viewer] start_dig: ${e.message}`);
                        }
                    }
                    break;

                case 'stop_dig':
                    try {
                        if (bot.targetDigBlock) {
                            bot.stopDigging();
                        }
                    } catch (e) {
                        // mineflayer кидает если нечего отменять — игнорим
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

                case 'click_window':
                    if (command.slot !== undefined) {
                        const mouseButton = command.mouseButton ?? 0;
                        const mode = command.mode ?? 0;
                        try {
                            if (bot.currentWindow) {
                                // Реальный GUI открыт — стандартный clickWindow
                                bot.clickWindow(command.slot, mouseButton, mode)
                                    .catch(err => sendLog(`[Viewer] clickWindow error: ${err.message}`));
                            } else {
                                // Открыт "виртуальный" inventory (наша Е-клавиша).
                                // bot.clickWindow требует currentWindow → используем simpleClick
                                // или fallback к moveSlotItem для shift+click.
                                if (mode === 1 && bot.inventory) {
                                    // Shift+click — быстрый перенос между inventory ↔ hotbar
                                    const item = bot.inventory.slots?.[command.slot];
                                    if (item) {
                                        // Источник: если в hotbar (36-44) — переносим в inventory (9-35)
                                        // если в inventory (9-35) — переносим в hotbar (36-44)
                                        const isHotbar = command.slot >= 36 && command.slot <= 44;
                                        const destRange = isHotbar ? [9, 35] : [36, 44];
                                        // Ищем пустой слот в destRange или совместимый стак
                                        let destSlot = -1;
                                        for (let s = destRange[0]; s <= destRange[1]; s++) {
                                            const existing = bot.inventory.slots?.[s];
                                            if (!existing) { destSlot = s; break; }
                                            if (existing.type === item.type && existing.count < existing.stackSize) {
                                                destSlot = s; break;
                                            }
                                        }
                                        if (destSlot >= 0 && typeof bot.moveSlotItem === 'function') {
                                            bot.moveSlotItem(command.slot, destSlot)
                                                .catch(err => sendLog(`[Viewer] moveSlotItem: ${err.message}`));
                                        }
                                    }
                                } else if (bot.simpleClick?.leftMouse && mouseButton === 0) {
                                    bot.simpleClick.leftMouse(command.slot);
                                } else if (bot.simpleClick?.rightMouse && mouseButton === 1) {
                                    bot.simpleClick.rightMouse(command.slot);
                                }
                            }
                        } catch (e) {
                            sendLog(`[Viewer] click_window error: ${e.message}`);
                        }
                    }
                    break;

                case 'close_window':
                    // Закрываем либо реальное окно сервера, либо наше виртуальное E-окно
                    viewerVirtualInventoryOpen = false;
                    if (bot.currentWindow) {
                        try {
                            bot.closeWindow(bot.currentWindow);
                        } catch (e) {
                            sendLog(`[Viewer] closeWindow error: ${e.message}`);
                        }
                    }
                    break;

                case 'request_player_list':
                    // Переиспользуем тот же broadcaster, что и периодический snapshot,
                    // чтобы payload содержал header/footer и team prefix/suffix.
                    // Если bot ещё не до конца spawned — broadcaster может быть null.
                    if (viewerSnapshotControl.broadcastPlayerList) {
                        try { viewerSnapshotControl.broadcastPlayerList(); }
                        catch (e) { sendLog(`[Viewer] request_player_list: ${e.message}`); }
                    }
                    break;

                case 'request_scoreboard':
                    if (viewerSnapshotControl.broadcastScoreboard) {
                        try { viewerSnapshotControl.broadcastScoreboard(); }
                        catch (e) { sendLog(`[Viewer] request_scoreboard: ${e.message}`); }
                    }
                    break;

                case 'drop_item': {
                    // Q — выкинуть один предмет из текущего хотбар-слота
                    // command.full = true → выкинуть весь стак (Ctrl+Q)
                    try {
                        const heldItem = bot.heldItem;
                        if (heldItem) {
                            const count = command.full ? heldItem.count : 1;
                            bot.toss(heldItem.type, heldItem.metadata, count)
                                .catch(err => sendLog(`[Viewer] Drop error: ${err.message}`));
                        }
                    } catch (e) {
                        sendLog(`[Viewer] drop_item: ${e.message}`);
                    }
                    break;
                }

                case 'swap_hands': {
                    // F — поменять предметы между основной и второй рукой (offhand)
                    try {
                        if (typeof bot.swapHands === 'function') {
                            bot.swapHands().catch(err => sendLog(`[Viewer] swap_hands error: ${err.message}`));
                        } else if (bot._client) {
                            // Ручной пакет, если функция отсутствует
                            bot._client.write('block_dig', {
                                status: 6, // SWAP_ITEM_WITH_OFFHAND
                                location: bot.entity.position,
                                face: 0
                            });
                        }
                    } catch (e) {
                        sendLog(`[Viewer] swap_hands: ${e.message}`);
                    }
                    break;
                }

                case 'use_item': {
                    // ПКМ — активировать предмет (use)
                    // Не делаем auto-deactivate, т.к. серверные GUI плагины
                    // могут не успеть открыть окно за 50мс. Для bow/crossbow
                    // используется отдельная команда deactivate_item.
                    try {
                        bot.activateItem(command.offHand === true);
                    } catch (e) {
                        sendLog(`[Viewer] use_item: ${e.message}`);
                    }
                    break;
                }

                case 'deactivate_item': {
                    try { bot.deactivateItem(); } catch (e) { sendLog(`[Viewer] deactivate_item: ${e.message}`); }
                    break;
                }

                case 'attack_entity': {
                    // ЛКМ по entity (вместо блока)
                    try {
                        if (command.entityId && bot.entities[command.entityId]) {
                            bot.attack(bot.entities[command.entityId]);
                        }
                    } catch (e) {
                        sendLog(`[Viewer] attack_entity: ${e.message}`);
                    }
                    break;
                }

                case 'place_block': {
                    // ПКМ по блоку — поставить блок из руки на грань
                    try {
                        if (command.position && command.face) {
                            const ref = bot.blockAt(new Vec3(
                                command.position.x, command.position.y, command.position.z
                            ));
                            if (ref) {
                                const faceVec = new Vec3(
                                    command.face.x || 0, command.face.y || 0, command.face.z || 0
                                );
                                bot.placeBlock(ref, faceVec)
                                    .catch(err => sendLog(`[Viewer] place_block error: ${err.message}`));
                            }
                        }
                    } catch (e) {
                        sendLog(`[Viewer] place_block: ${e.message}`);
                    }
                    break;
                }

                case 'activate_block': {
                    // ПКМ по блоку без предмета — открыть/активировать (сундук, рычаг и т.д.)
                    try {
                        if (command.position) {
                            const block = bot.blockAt(new Vec3(
                                command.position.x, command.position.y, command.position.z
                            ));
                            if (block) {
                                bot.activateBlock(block)
                                    .catch(err => sendLog(`[Viewer] activate_block error: ${err.message}`));
                            }
                        }
                    } catch (e) {
                        sendLog(`[Viewer] activate_block: ${e.message}`);
                    }
                    break;
                }

                case 'open_inventory': {
                    // E — emit виртуальное окно инвентаря (mineflayer не имеет реального windowOpen
                    // для player inventory, поэтому собираем slots вручную из bot.inventory)
                    if (process.send && bot.inventory) {
                        try {
                            viewerVirtualInventoryOpen = true;
                            process.send({
                                type: 'viewer:windowOpen',
                                payload: buildPlayerInventoryPayload(bot)
                            });
                        } catch (e) {
                            sendLog(`[Viewer] open_inventory: ${e.message}`);
                        }
                    }
                    break;
                }

                case 'sneak_toggle':
                    bot.setControlState('sneak', !!command.active);
                    break;

                case 'right_click_interact': {
                    // Последовательная попытка: activate_block → place_block → use_item.
                    // Останавливаемся, как только что-то сработало (открылось окно или
                    // успешно поставили блок). Серверы с GUI-предметами реагируют на
                    // activate_block, обычные сундуки/двери тоже; place_block нужен
                    // только если первое не сработало; use_item — финальный fallback.
                    (async () => {
                        try {
                            const hadWindow = !!bot.currentWindow;
                            if (command.position) {
                                const ref = bot.blockAt(new Vec3(
                                    command.position.x, command.position.y, command.position.z
                                ));
                                if (ref) {
                                    try { await bot.activateBlock(ref); }
                                    catch (e) { /* not interactable */ }
                                    // Окно открылось? значит сработало
                                    if (!hadWindow && bot.currentWindow) return;
                                    // place_block если в руке есть блок и есть грань
                                    if (command.face && bot.heldItem) {
                                        const faceVec = new Vec3(
                                            command.face.x || 0, command.face.y || 0, command.face.z || 0
                                        );
                                        try {
                                            await bot.placeBlock(ref, faceVec);
                                            return;
                                        } catch (e) { /* couldn't place */ }
                                    }
                                }
                            }
                            // финальный fallback — use_item (еда, лук, ведро воды)
                            try { bot.activateItem(false); } catch (e) { /* ignore */ }
                        } catch (e) {
                            sendLog(`[Viewer] right_click_interact: ${e.message}`);
                        }
                    })();
                    break;
                }
            }
        } catch (error) {
            sendLog(`[Viewer] Control error: ${error.message}`);
        }
    } else if (message.type === MessageTypes.GRAPH.EXECUTE_EVENT_GRAPH) {
        const { botId, graph, eventType, eventArgs } = message;

        try {
            const playerList = bot ? Object.keys(bot.players) : [];
            const botApi = createBotApi(bot, { enableLogging: true });

            const context = {
                bot: bot,  // Полный mineflayer bot
                botApi: botApi,  // API для обратной совместимости
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

            const engine = new GraphExecutionEngine(NodeRegistry, bot);
            await engine.execute(graph, context, eventType);


        } catch (error) {
            sendLog(`[EventGraph] Error executing ${eventType} graph: ${error.message}`);
            sendLog(`[EventGraph] Stack: ${error.stack}`);
        }
    } else if (message.type === MessageTypes.BOT.START) {
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

            // === Подавление PartialReadError и других некритичных protocol-ошибок ===
            // Серверы с кастомными плагинами часто шлют entity metadata в формате,
            // который protodef не может распарсить. Это спамит uncaught error в stderr,
            // но на работу бота не влияет — пакет просто игнорируется.
            // Глушим эти ошибки на уровне protocol client.
            const handleClientProtocolError = (err) => {
                const msg = err?.message || '';
                const name = err?.name || '';
                if (name === 'PartialReadError' || msg.includes('PartialReadError')
                    || msg.includes('Read error') || msg.includes('Unexpected buffer end')
                    || msg.includes('Chunk size is')) {
                    // некритично — packet drop, не валим бота
                    return;
                }
                sendLog(`[Protocol] ${err?.stack || err?.message || err}`);
            };
            if (bot._client) {
                bot._client.on('error', handleClientProtocolError);
            } else {
                // _client инициализируется чуть позже — ждём
                process.nextTick(() => {
                    bot._client?.on?.('error', handleClientProtocolError);
                });
            }

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

            // Plugin Registry для экспорта API между плагинами
            bot.pluginRegistry = new Map();

            const installedPluginNames = config.plugins.map(p => p.name);
            bot.api = {
                Command: Command,
                events: bot.events,
                sendMessage: (type, message, username) => {
                    if (type === 'websocket') {
                        if (process.send) {
                            process.send({
                                type: MessageTypes.WEBSOCKET.SEND_MESSAGE,
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
                                type: MessageTypes.COMMAND.REGISTER,
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
                                type: MessageTypes.USER.REQUEST_ACTION,
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
                            type: MessageTypes.PLUGIN.UI_DATA,
                            plugin: pluginName,
                            payload: newState
                        });
                    }
                },

                // === Методы для управления credentials ===
                updateCredentials: async ({ username, password }) => {
                    return new Promise((resolve, reject) => {
                        const requestId = uuidv4();
                        pendingRequests.set(requestId, { resolve, reject });

                        if (process.send) {
                            process.send({
                                type: MessageTypes.BOT.UPDATE_CREDENTIALS,
                                requestId,
                                payload: {
                                    botId: bot.config.id,
                                    username,
                                    password
                                }
                            });
                        } else {
                            reject(new Error('IPC channel is not available.'));
                        }

                        setTimeout(() => {
                            if (pendingRequests.has(requestId)) {
                                reject(new Error('Request to update credentials timed out.'));
                                pendingRequests.delete(requestId);
                            }
                        }, 10000);
                    });
                },

                restart: async () => {
                    return new Promise((resolve, reject) => {
                        const requestId = uuidv4();
                        pendingRequests.set(requestId, { resolve, reject });

                        if (process.send) {
                            process.send({
                                type: MessageTypes.BOT.RESTART,
                                requestId,
                                payload: {
                                    botId: bot.config.id
                                }
                            });
                        } else {
                            reject(new Error('IPC channel is not available.'));
                        }

                        setTimeout(() => {
                            if (pendingRequests.has(requestId)) {
                                reject(new Error('Request to restart bot timed out.'));
                                pendingRequests.delete(requestId);
                            }
                        }, 10000);
                    });
                },

                changeCredentials: async ({ username, password }) => {
                    return new Promise((resolve, reject) => {
                        const requestId = uuidv4();
                        pendingRequests.set(requestId, { resolve, reject });

                        if (process.send) {
                            process.send({
                                type: MessageTypes.BOT.CHANGE_CREDENTIALS,
                                requestId,
                                payload: {
                                    botId: bot.config.id,
                                    username,
                                    password
                                }
                            });
                        } else {
                            reject(new Error('IPC channel is not available.'));
                        }

                        setTimeout(() => {
                            if (pendingRequests.has(requestId)) {
                                reject(new Error('Request to change credentials timed out.'));
                                pendingRequests.delete(requestId);
                            }
                        }, 10000);
                    });
                }
            };

            bot.sendMessage = (type, message, username) => {
                bot.api.sendMessage(type, message, username);
            };

            // Добавляем bot.sendLog для команд
            bot.sendLog = (message) => sendLog(message);

            const processApi = {
                appendLog: (botId, message) => {
                    if (process.send) {
                        process.send({ type: MessageTypes.BOT.LOG, content: message });
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
                            bot: botInstance,  // Полный mineflayer bot для доступа к blockAt, inventory и т.д.
                            botApi: botInstance.api,  // API для обратной совместимости
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
                        type: MessageTypes.COMMAND.REGISTER,
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

            await ensurePluginDependencies(config.plugins, sendLog);
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
                        type: MessageTypes.VIEWER.CHAT,
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
                bot.events.emit('chat:message', {
                    username,
                    message,
                    type: EventTypes.CHAT,
                    raw: message
                });
            });

            bot.on('whisper', (username, message) => {
                if (messageHandledByCustomParser) return;
                bot.events.emit('chat:message', {
                    username,
                    message,
                    type: EventTypes.WHISPER,
                    raw: message
                });
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
                    process.send({ type: MessageTypes.BOT.READY });
                    process.send({ type: MessageTypes.BOT.STATUS, status: 'running' });
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
                if (typeof reason === 'string') {
                    try { reasonText = JSON.parse(reason).text || reason; } catch (e) { reasonText = reason; }
                } else if (reason && typeof reason === 'object') {
                    reasonText = reason.text || reason.message || reason.reason || JSON.stringify(reason);
                } else {
                    reasonText = String(reason);
                }
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
                        type: MessageTypes.VIEWER.SPAWN,
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
                        type: MessageTypes.VIEWER.HEALTH,
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
                        type: MessageTypes.VIEWER.MOVE,
                        payload: {
                            position: bot.entity?.position,
                            yaw: bot.entity?.yaw,
                            pitch: bot.entity?.pitch
                        }
                    });
                }
            });

            bot.on('blockUpdate', (oldBlock, newBlock) => {
                if (process.send && oldBlock && newBlock) {
                    process.send({
                        type: 'viewer:blockUpdate',
                        payload: {
                            position: {
                                x: newBlock.position.x,
                                y: newBlock.position.y,
                                z: newBlock.position.z
                            },
                            oldBlock: {
                                type: oldBlock.type,
                                name: oldBlock.name
                            },
                            newBlock: {
                                type: newBlock.type,
                                name: newBlock.name
                            }
                        }
                    });
                }
            });

            // === Viewer: контейнеры (windowOpen / windowUpdate / windowClose) ===
            // Извлечение текста из NBT-узла (mineflayer prismarine-nbt format)
            const extractNbtString = (node) => {
                if (node == null) return null;
                if (typeof node === 'string') return node;
                if (typeof node.value === 'string') return node.value;
                if (Array.isArray(node)) return node.map(extractNbtString).filter(Boolean).join('');
                return null;
            };

            // Парс JSON-component (как { text:..., extra:[{text:..., color:...}] }) в plain string с § кодами
            const COLOR_TO_CODE = {
                black: '0', dark_blue: '1', dark_green: '2', dark_aqua: '3',
                dark_red: '4', dark_purple: '5', gold: '6', gray: '7',
                dark_gray: '8', blue: '9', green: 'a', aqua: 'b',
                red: 'c', light_purple: 'd', yellow: 'e', white: 'f',
            };
            const parseTextComponent = (comp) => {
                if (!comp) return '';
                if (typeof comp === 'string') {
                    try { const j = JSON.parse(comp); return parseTextComponent(j); }
                    catch (e) { return comp; }
                }
                let out = '';
                if (comp.color && COLOR_TO_CODE[comp.color]) out += '§' + COLOR_TO_CODE[comp.color];
                if (comp.bold) out += '§l';
                if (comp.italic) out += '§o';
                if (comp.underlined) out += '§n';
                if (comp.strikethrough) out += '§m';
                if (comp.obfuscated) out += '§k';
                if (typeof comp.text === 'string') out += comp.text;
                if (Array.isArray(comp.extra)) {
                    for (const e of comp.extra) out += parseTextComponent(e);
                }
                return out;
            };

            // Парсинг NBT компонента display{Name,Lore} + новый customName/customLore (1.20.5+)
            const extractItemDisplay = (item) => {
                if (!item) return { displayName: null, lore: [] };
                try {
                    let displayName = null;
                    let lore = [];

                    const tryParseJson = (v) => {
                        if (typeof v !== 'string') return v;
                        const t = v.trim();
                        if (t.startsWith('{') || t.startsWith('[')) {
                            try { return JSON.parse(t); }
                            catch (e) { return v; }
                        }
                        return v;
                    };

                    // mineflayer 1.20.5+: customName / customLore
                    if (item.customName != null) {
                        displayName = parseTextComponent(tryParseJson(item.customName));
                    }
                    if (Array.isArray(item.customLore)) {
                        lore = item.customLore
                            .map(line => parseTextComponent(tryParseJson(line)))
                            .filter(Boolean);
                    }

                    // 1.20.5+ data components: item.components / item.componentMap
                    const components = item.components || item.componentMap;
                    if (components) {
                        if (!displayName) {
                            const cn = components['minecraft:custom_name']
                                ?? components['custom_name']
                                ?? components['minecraft:item_name']
                                ?? components['item_name'];
                            if (cn != null) displayName = parseTextComponent(tryParseJson(cn));
                        }
                        if (lore.length === 0) {
                            const cl = components['minecraft:lore']
                                ?? components['lore'];
                            if (Array.isArray(cl)) {
                                lore = cl.map(line => parseTextComponent(tryParseJson(line))).filter(Boolean);
                            } else if (cl?.lines && Array.isArray(cl.lines)) {
                                lore = cl.lines.map(line => parseTextComponent(tryParseJson(line))).filter(Boolean);
                            }
                        }
                    }

                    // Старый NBT формат: nbt.value.display.value.{Name,Lore}
                    if (item.nbt) {
                        const display = item.nbt?.value?.display?.value;
                        if (display) {
                            if (!displayName && display.Name?.value) {
                                displayName = parseTextComponent(tryParseJson(display.Name.value));
                            }
                            if (lore.length === 0 && Array.isArray(display.Lore?.value?.value)) {
                                lore = display.Lore.value.value
                                    .map(line => parseTextComponent(tryParseJson(line)))
                                    .filter(Boolean);
                            }
                        }
                    }
                    return { displayName, lore };
                } catch (e) {
                    return { displayName: null, lore: [] };
                }
            };

            // Безопасное преобразование любого title (строка/JSON/component) в строку с § кодами
            const titleToString = (t) => {
                if (t == null) return '';
                if (typeof t !== 'string') return parseTextComponent(t) || '';
                const trimmed = t.trim();
                if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try {
                        return parseTextComponent(JSON.parse(trimmed));
                    } catch (e) { return t; }
                }
                return t;
            };

            const serializeWindow = (window) => {
                if (!window) return null;
                try {
                    const slots = (window.slots || []).map((item, idx) => {
                        if (!item) return { slot: idx, empty: true };
                        const { displayName: customName, lore } = extractItemDisplay(item);
                        return {
                            slot: idx,
                            name: item.name,
                            displayName: item.displayName,
                            customName, // raw § coded
                            lore,       // массив строк с § кодами
                            count: item.count,
                            type: item.type,
                            metadata: item.metadata,
                            stackId: item.stackId,
                            nbt: item.nbt ? true : false,
                        };
                    });
                    return {
                        id: window.id,
                        type: window.type,
                        title: titleToString(window.title),
                        slotCount: window.slots ? window.slots.length : 0,
                        inventoryStart: window.inventoryStart,
                        inventoryEnd: window.inventoryEnd,
                        hotbarStart: window.hotbarStart,
                        slots,
                    };
                } catch (e) {
                    sendLog(`[Viewer] serializeWindow error: ${e.message}`);
                    return null;
                }
            };

            const broadcastWindowUpdate = () => {
                if (!process.send) return;
                const w = bot.currentWindow;
                if (!w) return;
                process.send({
                    type: 'viewer:windowUpdate',
                    payload: serializeWindow(w)
                });
            };

            // === Throttle helper (объявляем РАНЬШЕ листенеров чтобы избежать TDZ) ===
            const makeThrottled = (fn, delay = 200) => {
                let timer = null;
                let lastArgs = null;
                let lastRun = 0;
                return (...args) => {
                    lastArgs = args;
                    const now = Date.now();
                    const remaining = delay - (now - lastRun);
                    if (remaining <= 0) {
                        lastRun = now;
                        fn(...lastArgs);
                    } else if (!timer) {
                        timer = setTimeout(() => {
                            timer = null;
                            lastRun = Date.now();
                            fn(...lastArgs);
                        }, remaining);
                    }
                };
            };

            // === Viewer: список игроков (TAB) ===
            let tablistHeader = '';
            let tablistFooter = '';

            const getTeamForPlayer = (username) => {
                if (!bot.teamMap) return null;
                const team = bot.teamMap[username];
                if (!team) return null;
                try {
                    return {
                        name: typeof team.name === 'string' ? team.name : (team.name?.toString?.() || ''),
                        prefix: team.prefix,
                        suffix: team.suffix,
                        color: typeof team.color === 'string' ? team.color : null,
                        nameTagVisibility: team.nameTagVisibility,
                    };
                } catch (e) { return null; }
            };

            const broadcastPlayerList = () => {
                if (!process.send) return;
                const toLegacy = (v) => {
                    if (v == null) return '';
                    if (typeof v !== 'string') return parseTextComponent(v) || '';
                    const t = v.trim();
                    if (t.startsWith('{') || t.startsWith('[')) {
                        try { return parseTextComponent(JSON.parse(t)); }
                        catch (e) { return v; }
                    }
                    return v;
                };
                const players = bot.players ? Object.values(bot.players).map(p => {
                    const team = getTeamForPlayer(p.username);
                    return {
                        username: p.username,
                        displayName: toLegacy(p.displayName) || p.username,
                        ping: p.ping,
                        gamemode: p.gamemode,
                        uuid: p.uuid,
                        prefix: toLegacy(team?.prefix),
                        suffix: toLegacy(team?.suffix),
                        teamColor: team?.color || null,
                        teamName: team?.name || null,
                    };
                }) : [];
                process.send({
                    type: 'viewer:playerList',
                    payload: {
                        players,
                        header: tablistHeader,
                        footer: tablistFooter,
                    }
                });
            };

            // === Viewer: скорборд (Sidebar) ===
            const serializeScoreboard = (sb) => {
                if (!sb) return null;
                try {
                    const toLegacy = (v) => {
                        if (v == null) return '';
                        if (typeof v !== 'string') return parseTextComponent(v) || '';
                        const t = v.trim();
                        if (t.startsWith('{') || t.startsWith('[')) {
                            try { return parseTextComponent(JSON.parse(t)); }
                            catch (e) { return v; }
                        }
                        return v;
                    };
                    const items = sb.itemsMap
                        ? Object.values(sb.itemsMap).map(item => {
                            // Имя записи — это собственно текст строки на скорборде.
                            // Если есть team у этого имени, prefix+suffix дают окрашенный текст.
                            let line = '';
                            const team = bot.teamMap?.[item.name];
                            if (team) {
                                const prefix = toLegacy(team.prefix);
                                const suffix = toLegacy(team.suffix);
                                line = prefix + item.name + suffix;
                            } else {
                                line = item.name;
                            }
                            return {
                                name: item.name,
                                line, // готовая строка с § кодами
                                displayName: toLegacy(item.displayName) || item.name,
                                value: item.value,
                            };
                        }).sort((a, b) => (b.value || 0) - (a.value || 0))
                        : [];
                    return {
                        name: sb.name,
                        title: toLegacy(sb.title) || sb.name,
                        items,
                    };
                } catch (e) {
                    return null;
                }
            };

            const broadcastScoreboard = () => {
                if (!process.send) return;
                const sb = bot.scoreboard?.sidebar
                    || (bot.scoreboards ? Object.values(bot.scoreboards).find(s => s) : null);
                process.send({
                    type: 'viewer:scoreboard',
                    payload: serializeScoreboard(sb)
                });
            };

            // Throttled варианты — теперь объявлены ДО регистрации листенеров.
            // Mineflayer не эмитит эти события синхронно во время setup, но опираться
            // на это нельзя: при изменении порядка инициализации легко словить TDZ.
            const broadcastScoreboardThrottled = makeThrottled(broadcastScoreboard, 250);
            const broadcastPlayerListThrottled = makeThrottled(broadcastPlayerList, 250);

            // === Регистрация листенеров с сохранением ссылок — для отписки на bot end ===
            // Текущая подписка на updateSlot открытого Window. Подписку на bot.inventory
            // достаточно одной (висит постоянно — игрок всегда имеет inventory).
            // А вот listener на window НУЖНО переподписывать на каждый windowOpen,
            // потому что window-объект меняется, и slot-события в обычных контейнерах
            // (сундук, печь, верстак) эмитятся именно от window, а не от bot.inventory.
            let currentWindowSlotListener = null;
            const currentWindowSlotHandler = () => {
                if (process.send && bot.currentWindow) broadcastWindowUpdate();
            };

            const onWindowOpen = (window) => {
                if (!process.send) return;
                // Снимаем старый listener (на случай если windowOpen прилетел повторно)
                if (currentWindowSlotListener) {
                    try { currentWindowSlotListener.off?.('updateSlot', currentWindowSlotHandler); }
                    catch (e) { /* ignore */ }
                    currentWindowSlotListener = null;
                }
                // Подписываемся на slot-обновления НА window-объекте
                window?.on?.('updateSlot', currentWindowSlotHandler);
                currentWindowSlotListener = window;

                process.send({
                    type: 'viewer:windowOpen',
                    payload: serializeWindow(window)
                });
            };
            const onWindowClose = () => {
                if (!process.send) return;
                viewerVirtualInventoryOpen = false;
                // Отписываемся от window listener
                if (currentWindowSlotListener) {
                    try { currentWindowSlotListener.off?.('updateSlot', currentWindowSlotHandler); }
                    catch (e) { /* ignore */ }
                    currentWindowSlotListener = null;
                }
                process.send({ type: 'viewer:windowClose', payload: {} });
            };
            const onInventoryUpdate = () => {
                if (!process.send) return;
                if (bot.currentWindow) {
                    // Реальный GUI открыт — обновляем его слоты.
                    // (Также может сработать listener на самом window — двойной emit
                    // в худшем случае, но throttle на frontend это компенсирует.)
                    broadcastWindowUpdate();
                } else if (viewerVirtualInventoryOpen) {
                    // Открыто наше виртуальное E-окно — пере-эмитим windowUpdate
                    // с актуальным состоянием bot.inventory (нужно после moveSlotItem).
                    process.send({
                        type: 'viewer:windowUpdate',
                        payload: buildPlayerInventoryPayload(bot)
                    });
                }
            };
            const onPlayerListChange = () => broadcastPlayerListThrottled();
            const handleTabHeaderFooter = (packet) => {
                try {
                    const headerRaw = packet.header ?? packet.headerJson;
                    const footerRaw = packet.footer ?? packet.footerJson;
                    const parseHF = (raw) => {
                        if (!raw) return '';
                        if (typeof raw === 'string') {
                            const t = raw.trim();
                            if (t.startsWith('{') || t.startsWith('[')) {
                                try { return parseTextComponent(JSON.parse(t)); }
                                catch (e) { return raw; }
                            }
                            return raw;
                        }
                        return parseTextComponent(raw);
                    };
                    tablistHeader = parseHF(headerRaw);
                    tablistFooter = parseHF(footerRaw);
                    broadcastPlayerListThrottled();
                } catch (e) { /* ignore */ }
            };
            const teamUpdateHandler = () => {
                broadcastPlayerListThrottled();
                broadcastScoreboardThrottled();
            };
            const onScoreboardChange = () => broadcastScoreboardThrottled();

            bot.on('windowOpen', onWindowOpen);
            bot.on('windowClose', onWindowClose);
            bot.inventory?.on?.('updateSlot', onInventoryUpdate);

            bot.on('playerJoined', onPlayerListChange);
            bot.on('playerLeft', onPlayerListChange);
            bot.on('playerUpdated', onPlayerListChange);

            bot._client?.on?.('playerlist_header', handleTabHeaderFooter);
            bot._client?.on?.('player_list_header_footer', handleTabHeaderFooter);
            bot._client?.on?.('tab_list_header_footer', handleTabHeaderFooter);

            bot.on('scoreboardCreated', onScoreboardChange);
            bot.on('scoreboardDeleted', onScoreboardChange);
            bot.on('scoreboardTitleChanged', onScoreboardChange);
            bot.on('scoreUpdated', onScoreboardChange);
            bot.on('scoreRemoved', onScoreboardChange);
            bot.on('scoreboardPosition', onScoreboardChange);

            bot.on('teamCreated', teamUpdateHandler);
            bot.on('teamRemoved', teamUpdateHandler);
            bot.on('teamUpdated', teamUpdateHandler);
            bot.on('teamMemberAdded', teamUpdateHandler);
            bot.on('teamMemberRemoved', teamUpdateHandler);

            // === Периодический snapshot — теперь запускается ТОЛЬКО когда есть зрители ===
            // Каждые 500мс собираем полный snapshot scoreboard и player list для
            // защиты от потерянных событий. Без подписчиков — холостые IPC, поэтому
            // включаем по сигналу viewer:subscribers_changed из MinecraftViewerService.
            let snapshotInterval = null;
            const startSnapshot = () => {
                if (snapshotInterval) return;
                snapshotInterval = setInterval(() => {
                    if (!process.send) return;
                    broadcastScoreboard();
                    broadcastPlayerList();
                }, 500);
            };
            const stopSnapshot = () => {
                if (snapshotInterval) {
                    clearInterval(snapshotInterval);
                    snapshotInterval = null;
                }
            };
            viewerSnapshotControl.startSnapshot = startSnapshot;
            viewerSnapshotControl.stopSnapshot = stopSnapshot;
            // Экспортируем broadcaster'ы, чтобы request_player_list/request_scoreboard
            // отсюда же шли через полный сериализатор (с header/footer, team prefix/suffix).
            viewerSnapshotControl.broadcastPlayerList = broadcastPlayerList;
            viewerSnapshotControl.broadcastScoreboard = broadcastScoreboard;
            // Если зрители уже были подключены до bot.spawn — стартуем сразу
            if (viewerSubscriberCount > 0) startSnapshot();

            // === Отписка всех листенеров на bot end / error (предотвращает утечки) ===
            const detachViewerListeners = () => {
                stopSnapshot();
                viewerSnapshotControl.startSnapshot = null;
                viewerSnapshotControl.stopSnapshot = null;
                viewerSnapshotControl.broadcastPlayerList = null;
                viewerSnapshotControl.broadcastScoreboard = null;
                try {
                    bot.off?.('windowOpen', onWindowOpen);
                    bot.off?.('windowClose', onWindowClose);
                    bot.inventory?.off?.('updateSlot', onInventoryUpdate);
                    // Снимаем подписку с текущего открытого window (если есть)
                    if (currentWindowSlotListener) {
                        currentWindowSlotListener.off?.('updateSlot', currentWindowSlotHandler);
                        currentWindowSlotListener = null;
                    }
                    bot.off?.('playerJoined', onPlayerListChange);
                    bot.off?.('playerLeft', onPlayerListChange);
                    bot.off?.('playerUpdated', onPlayerListChange);
                    bot._client?.off?.('playerlist_header', handleTabHeaderFooter);
                    bot._client?.off?.('player_list_header_footer', handleTabHeaderFooter);
                    bot._client?.off?.('tab_list_header_footer', handleTabHeaderFooter);
                    bot.off?.('scoreboardCreated', onScoreboardChange);
                    bot.off?.('scoreboardDeleted', onScoreboardChange);
                    bot.off?.('scoreboardTitleChanged', onScoreboardChange);
                    bot.off?.('scoreUpdated', onScoreboardChange);
                    bot.off?.('scoreRemoved', onScoreboardChange);
                    bot.off?.('scoreboardPosition', onScoreboardChange);
                    bot.off?.('teamCreated', teamUpdateHandler);
                    bot.off?.('teamRemoved', teamUpdateHandler);
                    bot.off?.('teamUpdated', teamUpdateHandler);
                    bot.off?.('teamMemberAdded', teamUpdateHandler);
                    bot.off?.('teamMemberRemoved', teamUpdateHandler);
                } catch (e) { /* best-effort */ }
            };
            bot.once?.('end', detachViewerListeners);
            bot.once?.('error', detachViewerListeners);
        } catch (err) {
            sendLog(`[CRITICAL] Критическая ошибка при создании бота: ${err.stack}`);
            process.exit(1);
        }
    } else if (message.type === MessageTypes.CONFIG.RELOAD) {
        sendLog('[System] Received config:reload command. Reloading configuration...');
        try {
            const newConfig = await fetchNewConfig(bot.config.id, prisma);
            if (newConfig) {
                bot.config = { ...bot.config, ...newConfig };
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
    } else if (message.type === MessageTypes.BOT.STOP) {
        if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
        }
        botReadySent = false;
        if (bot) bot.quit();
        else process.exit(0);
    } else if (message.type === MessageTypes.CHAT.CHAT) {
        if (bot && bot.entity) {
            const { message: msg, chatType, username } = message.payload;
            bot.messageQueue.enqueue(chatType, msg, username);
        }
    } else if (message.type === MessageTypes.COMMAND.REGISTER_TEMP) {
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
    } else if (message.type === MessageTypes.COMMAND.UNREGISTER_TEMP) {
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
    } else if (message.type === MessageTypes.GRAPH.EXECUTE_HANDLER) {
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
    } else if (message.type === MessageTypes.GRAPH.EXECUTE_COMMAND_REQUEST) {
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
                            process.send({ type: MessageTypes.GRAPH.EXECUTE_COMMAND_RESPONSE, requestId, result });
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
                                process.send({ type: MessageTypes.GRAPH.EXECUTE_COMMAND_RESPONSE, requestId, result });
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
                    process.send({ type: MessageTypes.GRAPH.EXECUTE_COMMAND_RESPONSE, requestId, error: error.message });
                }
            }
        })();
    } else if (message.type === MessageTypes.USER.INVALIDATE_USER_CACHE) {
        if (message.username && bot && bot.config) {
            UserService.clearCache(message.username, bot.config.id);
        }
    } else if (message.type === MessageTypes.USER.INVALIDATE_ALL_USER_CACHE) {
        if (bot && bot.config) {
            for (const [cacheKey, user] of UserService.cache.entries()) {
                if (cacheKey.startsWith(`${bot.config.id}:`)) {
                    UserService.cache.delete(cacheKey);
                }
            }
            sendLog(`[BotProcess] Кэш пользователей очищен для бота ${bot.config.id}`);
        }
    } else if (message.type === MessageTypes.COMMAND.HANDLE_PERMISSION_ERROR) {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onInsufficientPermissions !== Command.prototype.onInsufficientPermissions) {
                commandInstance.onInsufficientPermissions(bot, typeChat, { username });
            } else {
                bot.api.sendMessage(typeChat, `У вас нет прав для выполнения команды ${commandName}.`, username);
            }
        }
    } else if (message.type === MessageTypes.COMMAND.HANDLE_WRONG_CHAT) {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onWrongChatType !== Command.prototype.onWrongChatType) {
                commandInstance.onWrongChatType(bot, typeChat, { username });
            } else {
                bot.api.sendMessage('private', `Команду ${commandName} нельзя использовать в этом типе чата - ${typeChat}.`, username);
            }
        }
    } else if (message.type === MessageTypes.COMMAND.HANDLE_COOLDOWN) {
        const { commandName, username, typeChat, timeLeft } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onCooldown !== Command.prototype.onCooldown) {
                commandInstance.onCooldown(bot, typeChat, { username }, timeLeft);
            } else {
                bot.api.sendMessage(typeChat, `Команду ${commandName} можно будет использовать через ${timeLeft} сек.`, username);
            }
        }
    } else if (message.type === MessageTypes.COMMAND.HANDLE_BLACKLIST) {
        const { commandName, username, typeChat } = message;
        const commandInstance = bot.commands.get(commandName);
        if (commandInstance) {
            if (commandInstance.onBlacklisted !== Command.prototype.onBlacklisted) {
                commandInstance.onBlacklisted(bot, typeChat, { username });
            }
        }
    } else if (message.type === MessageTypes.CHAT.SEND_MESSAGE) {
        const { typeChat, message: msg, username } = message;
        if (bot && bot.api) {
            bot.api.sendMessage(typeChat, msg, username);
        }
    } else if (message.type === MessageTypes.CHAT.ACTION) {
        if (message.name === 'lookAt' && bot && message.payload.position) {
            const { x, y, z } = message.payload.position;
            if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
                bot.lookAt(new Vec3(x, y, z));
            } else {
                sendLog(`[BotProcess] Ошибка lookAt: получены невалидные координаты: ${JSON.stringify(message.payload.position)}`);
            }
        }
    } else if (message.type === MessageTypes.PLUGINS.RELOAD) {
        sendLog('[System] Получена команда на перезагрузку плагинов...');
        const newConfig = await fetchNewConfig(bot.config.id, prisma);
        if (newConfig) {
            // Обновляем конфигурацию бота, сохраняя все поля включая прокси
            bot.config = { ...bot.config, ...newConfig };
            bot.config.plugins = newConfig.installedPlugins;
            bot.commands.clear();
            await loadCommands(bot, newConfig.commands);
            await initializePlugins(bot, newConfig.installedPlugins, prisma);
            sendLog('[System] Плагины успешно перезагружены.');
        } else {
            sendLog('[System] Не удалось получить новую конфигурацию для перезагрузки плагинов.');
        }
    } else if (message.type === MessageTypes.SERVER.COMMAND) {
        if (bot && bot.messageQueue && message.payload && message.payload.command) {
            bot.messageQueue.enqueue('command', message.payload.command);
        }
    } else if (message.type === MessageTypes.GRAPH.EXECUTE_EVENT_GRAPH) {
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

            const botApi = createBotApi(bot);

            const players = bot ? Object.keys(bot.players) : [];

            const context = {
                bot: bot,  // Полный mineflayer bot
                botApi: botApi,  // API для обратной совместимости
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

            const engine = new GraphExecutionEngine(NodeRegistry, bot);

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
    // PartialReadError и подобные protocol-ошибки не должны валить процесс бота.
    // Они происходят, когда minecraft-protocol не может распарсить кастомный пакет
    // (часто на серверах с плагинами шлющими нестандартный entity_metadata).
    const name = error?.name || '';
    const msg = error?.message || '';
    if (name === 'PartialReadError' || msg.includes('PartialReadError')
        || msg.includes('Read error') || msg.includes('Unexpected buffer end')) {
        sendLog(`[Protocol] Игнорирую некритичную ошибку парсинга пакета: ${msg}`);
        return;
    }
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

