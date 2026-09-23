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

function createTestBot(recordEffect) {
    const record = typeof recordEffect === 'function' ? recordEffect : () => {};
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
    base.username = 'TestBot';
    base.entity = { position: { x: 0, y: 64, z: 0 }, yaw: 0, pitch: 0 };
    base.players = {};
    base.entities = {};
    base.health = 20;
    base.food = 20;
    base.sendMessage = sendMessage;
    base.sendLog = sendLog;
    base.chat = chat;
    base.lookAt = () => {};
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
}) {
    const namedArgs = sanitizeArgs(args || eventArgs.args || eventArgs.commandArguments || {});
    const userName = sanitizeUsername(username || eventArgs.username || eventArgs.user?.username);
    const chat = sanitizeTypeChat(typeChat || eventArgs.typeChat || eventArgs.chatType);
    const user = { username: userName };
    const mergedEventArgs = {
        ...sanitizeEventArgs(eventArgs),
        commandName: commandName || eventArgs.commandName || '',
        user,
        args: namedArgs,
        typeChat: chat,
        username: userName,
    };
    const bot = createTestBot(recordEffect);

    return {
        botId,
        graphId,
        eventType,
        eventArgs: mergedEventArgs,
        user,
        args: namedArgs,
        commandArguments: namedArgs,
        typeChat: chat,
        players: [],
        botState: { yaw: 0, pitch: 0 },
        botEntity: {
            position: { x: 0, y: 64, z: 0 },
            yaw: 0,
            pitch: 0,
        },
        bot,
        botApi: bot.api,
        api: bot.api,
        services: new Proxy({}, createMockHandler('services')),
        __testMode: true,
        recordEffect: typeof recordEffect === 'function' ? recordEffect : () => {},
    };
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
