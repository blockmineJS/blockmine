const { randomUUID } = require('crypto');

const CHAT_TYPES = new Set(['chat', 'private', 'global', 'clan']);

function clip(value, max = 2000) {
    const text = value === undefined || value === null ? '' : String(value);
    return text.length > max ? `${text.slice(0, max)}...` : text;
}

function sanitizeUsername(value) {
    const name = clip(value || 'TestPlayer', 32).replace(/[\r\n]/g, '').trim();
    return name || 'TestPlayer';
}

function sanitizeTypeChat(value) {
    return CHAT_TYPES.has(value) ? value : 'chat';
}

function sanitizeArgs(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out = {};
    for (const key of Object.keys(value).slice(0, 32)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)) continue;
        const item = value[key];
        if (typeof item === 'string') out[key] = clip(item);
        else if (typeof item === 'number' && Number.isFinite(item)) out[key] = item;
        else if (typeof item === 'boolean') out[key] = item;
        else if (item === null) out[key] = null;
    }
    return out;
}

function sanitizeEventArgs(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    try {
        const text = JSON.stringify(value);
        if (!text || text.length > 100000) return {};
        return JSON.parse(text);
    } catch {
        return {};
    }
}

function createMockHandler(label) {
    return {
        get(target, prop) {
            if (prop === 'then') return undefined;
            if (prop === Symbol.toPrimitive) return () => `[mock:${label}]`;
            if (prop === 'toString') return () => `[mock:${label}]`;
            if (prop in target) return target[prop];
            const child = function () {
                return undefined;
            };
            const proxied = new Proxy(child, createMockHandler(`${label}.${String(prop)}`));
            target[prop] = proxied;
            return proxied;
        },
        apply() {
            return undefined;
        },
    };
}

function createTestBot(recordEffect, world = {}) {
    const record = typeof recordEffect === 'function' ? recordEffect : () => {};
    const position = {
        x: Number(world.position?.x) || 0,
        y: Number.isFinite(Number(world.position?.y)) ? Number(world.position.y) : 64,
        z: Number(world.position?.z) || 0,
    };
    const slots = (Array.isArray(world.inventory) ? world.inventory : []).map((item, index) => {
        if (!item) return null;
        if (typeof item === 'string') {
            return { name: item, displayName: item, count: 1, slot: index, type: item };
        }
        return {
            name: item.name,
            displayName: item.displayName || item.name,
            count: item.count || 1,
            slot: item.slot ?? index,
            type: item.type || item.name,
        };
    }).filter(Boolean);
    const sendMessage = (type, message, username) => {
        record({
            kind: 'message',
            chatType: sanitizeTypeChat(type),
            message: clip(message),
            username: username ? clip(username, 32) : null,
        });
    };
    const sendLog = (message) => {
        record({ kind: 'log', message: clip(message) });
    };
    const chat = (message) => {
        record({ kind: 'chat', message: clip(message) });
    };

    const base = function () {};
    base.username = world.username || 'TestBot';
    base.entity = { position, yaw: 0, pitch: 0, onGround: true };
    base.players = {};
    for (const player of world.players || []) {
        const name = String(player || '').trim();
        if (!name) continue;
        base.players[name] = { username: name, entity: { position: { x: 1, y: 64, z: 1 } } };
    }
    base.entities = {};
    base.health = Number.isFinite(Number(world.health)) ? Number(world.health) : 20;
    base.food = Number.isFinite(Number(world.food)) ? Number(world.food) : 20;
    base.inventory = {
        slots,
        items() { return slots.filter(Boolean); },
    };
    base.heldItem = null;
    base.sendMessage = sendMessage;
    base.sendLog = sendLog;
    base.chat = chat;
    base.lookAt = async (x, y, z) => {
        record({ kind: 'look', message: `${x} ${y} ${z}` });
    };
    base.setControlState = (control, value) => {
        record({ kind: 'control', message: `${control}=${Boolean(value)}` });
    };
    base.equip = async (item, destination) => {
        base.heldItem = item;
        record({ kind: 'equip', message: `${item?.name || 'item'} -> ${destination || 'hand'}` });
    };
    base.pathfinder = {
        async goto(goal) {
            if (goal && Number.isFinite(Number(goal.x))) position.x = Number(goal.x);
            if (goal && Number.isFinite(Number(goal.y))) position.y = Number(goal.y);
            if (goal && Number.isFinite(Number(goal.z))) position.z = Number(goal.z);
            record({ kind: 'move', message: `${position.x} ${position.y} ${position.z}` });
        },
    };
    base.api = { sendMessage, sendLog, chat };

    return new Proxy(base, createMockHandler('bot'));
}

function buildTestContext({
    botId,
    graphId,
    eventType = 'command',
    eventArgs = {},
    args,
    username,
    typeChat,
    commandName,
    recordEffect,
    world = {},
}) {
    const { buildGraphContext } = require('../graphContext');
    const { createTestGraphServices } = require('../graphServices');
    const userName = sanitizeUsername(username || eventArgs.username || eventArgs.user?.username);
    const chat = sanitizeTypeChat(typeChat || eventArgs.typeChat || eventArgs.chatType);
    const services = createTestGraphServices(recordEffect, world);
    const bot = createTestBot(recordEffect, world);
    return buildGraphContext({
        bot,
        botId,
        graphId,
        eventType,
        eventArgs: sanitizeEventArgs(eventArgs),
        user: { username: userName },
        args: sanitizeArgs(args || eventArgs.args || eventArgs.commandArguments || {}),
        typeChat: chat,
        commandName,
        services,
        recordEffect: typeof recordEffect === 'function' ? recordEffect : () => {},
    });
}

function createEffectRecorder(graphId, { broadcast = true } = {}) {
    const effects = [];

    const recordEffect = (entry) => {
        const effect = {
            id: randomUUID(),
            at: Date.now(),
            ...entry,
        };
        effects.push(effect);
        if (!broadcast) return effect;
        try {
            const { getGlobalDebugManager } = require('./DebugSessionManager');
            const debugState = getGlobalDebugManager().get(graphId);
            if (debugState) {
                debugState.broadcast('debug:test-effect', { effect });
            }
        } catch {
        }
        return effect;
    };

    return { effects, recordEffect };
}

module.exports = {
    sanitizeArgs,
    sanitizeUsername,
    sanitizeTypeChat,
    sanitizeEventArgs,
    createTestBot,
    buildTestContext,
    createEffectRecorder,
};
