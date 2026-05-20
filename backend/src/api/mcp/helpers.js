const { userCanAccessBot } = require('../middleware/botAccess');

const BOT_ACCESS_TTL_MS = 30 * 1000;
const botAccessCache = new Map();

async function cachedBotAccess(userId, botId) {
    const key = `${userId}:${botId}`;
    const cached = botAccessCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.allowed;

    const allowed = await userCanAccessBot(userId, botId);
    botAccessCache.set(key, { allowed, expires: Date.now() + BOT_ACCESS_TTL_MS });
    if (botAccessCache.size > 1000) {
        const oldestKey = botAccessCache.keys().next().value;
        botAccessCache.delete(oldestKey);
    }
    return allowed;
}

function ok(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(message, extras) {
    const payload = { success: false, error: message };
    if (extras && typeof extras === 'object') Object.assign(payload, extras);
    return ok(payload);
}

function safeErrorMessage(e) {
    const raw = (e && e.message) ? String(e.message) : 'Internal error';
    if (/prisma|p20\d{2}|column|table|database/i.test(raw)) {
        return 'Database error';
    }
    return raw.slice(0, 500);
}

function fail(e, label = 'Internal error') {
    console.error(`[MCP tool] ${label}:`, e);
    return err(safeErrorMessage(e));
}

function wrap(toolName, handler) {
    return async (args, extra) => {
        try {
            return await handler(args, extra);
        } catch (e) {
            return fail(e, toolName);
        }
    };
}

function hasPermission(user, perm) {
    if (!user || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes('*') || user.permissions.includes(perm);
}

function requirePermission(user, perm) {
    return hasPermission(user, perm) ? null : err('Permission denied', { required: perm });
}

async function requireBotAccess(user, botId) {
    if (!user || typeof user.userId !== 'number') return err('Unauthorized');
    if (!Number.isInteger(botId)) return err('Invalid botId');
    if (!await cachedBotAccess(user.userId, botId)) return err('Access to this bot is denied');
    return null;
}

function jsonField(value, fallback = null) {
    if (value == null) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

async function getAllowedBotIds(userId) {
    const prisma = require('../../lib/prisma');
    const panelUser = await prisma.panelUser.findUnique({
        where: { id: userId },
        include: { botAccess: { select: { botId: true } } },
    });
    if (!panelUser) return [];
    if (panelUser.allBots !== false) return null;
    return panelUser.botAccess.map((entry) => entry.botId);
}

module.exports = {
    ok,
    err,
    fail,
    wrap,
    safeErrorMessage,
    hasPermission,
    requirePermission,
    requireBotAccess,
    jsonField,
    getAllowedBotIds,
};
