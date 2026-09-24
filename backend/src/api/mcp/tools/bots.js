const { z } = require('zod');
const prisma = require('../../../lib/prisma');
const { botManager } = require('../../../core/services');
const { encrypt } = require('../../../core/utils/crypto');
const { setupDefaultPermissionsForBot } = require('../../../core/setupDefaultBotPermissions');
const botHistoryStore = require('../../../core/BotHistoryStore');
const { ok, err, wrap, requirePermission, requireBotAccess, getAllowedBotIds, publicBot } = require('../helpers');

const botInclude = { server: true, proxy: true };

function register(server, { user }) {
    server.registerTool('list_bots', {
        description: 'List all bots accessible to the current API key, including their server and proxy.',
        inputSchema: {},
    }, wrap('list_bots', async () => {
        const allowedIds = await getAllowedBotIds(user.userId);
        const where = allowedIds === null ? {} : { id: { in: allowedIds.length ? allowedIds : [-1] } };
        const bots = await prisma.bot.findMany({
            where,
            include: { server: true, proxy: true },
            orderBy: { sortOrder: 'asc' },
        });
        return ok(bots.map(publicBot));
    }));

    server.registerTool('get_bot', {
        description: 'Get a single bot by id with full configuration.',
        inputSchema: { botId: z.number().int().describe('Bot id') },
    }, wrap('get_bot', async ({ botId }) => {
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const bot = await prisma.bot.findUnique({
            where: { id: botId },
            include: { server: true, proxy: true },
        });
        if (!bot) return err('Bot not found');
        return ok(publicBot(bot));
    }));

    server.registerTool('get_bot_states', {
        description: 'Get the running state of every bot accessible to the current API key (running/stopped, uptime, etc).',
        inputSchema: {},
    }, wrap('get_bot_states', async () => {
        const allowedIds = await getAllowedBotIds(user.userId);
        const state = botManager.getFullState();
        if (allowedIds === null) return ok(state);
        const allowed = new Set(allowedIds);
        const filterByBotId = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            const out = {};
            for (const key of Object.keys(obj)) {
                if (allowed.has(parseInt(key, 10))) out[key] = obj[key];
            }
            return out;
        };
        const filtered = {};
        for (const topKey of Object.keys(state)) {
            filtered[topKey] = filterByBotId(state[topKey]);
        }
        return ok(filtered);
    }));

    server.registerTool('start_bot', {
        description: 'Start a bot by id.',
        inputSchema: { botId: z.number().int() },
    }, wrap('start_bot', async ({ botId }) => {
        const permErr = requirePermission(user, 'bot:start_stop');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const botConfig = await prisma.bot.findUnique({
            where: { id: botId },
            include: { server: true, proxy: true },
        });
        if (!botConfig) return err('Bot not found');
        botManager.startBot(botConfig);
        return ok({ success: true, message: 'Start command dispatched', botId });
    }));

    server.registerTool('stop_bot', {
        description: 'Stop a bot by id.',
        inputSchema: { botId: z.number().int() },
    }, wrap('stop_bot', async ({ botId }) => {
        const permErr = requirePermission(user, 'bot:start_stop');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        botManager.stopBot(botId);
        return ok({ success: true, message: 'Stop command dispatched', botId });
    }));

    server.registerTool('restart_bot', {
        description: 'Restart a bot by id (stop, then start one second later).',
        inputSchema: { botId: z.number().int() },
    }, wrap('restart_bot', async ({ botId }) => {
        const permErr = requirePermission(user, 'bot:start_stop');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        if (botManager.isBotRunning(botId)) {
            await botManager.restartBot(botId);
        } else {
            const botConfig = await prisma.bot.findUnique({
                where: { id: botId },
                include: botInclude,
            });
            if (!botConfig) return err('Bot not found');
            await botManager.startBot(botConfig);
        }
        return ok({ success: true, message: 'Restart command dispatched', botId });
    }));

    server.registerTool('send_message_to_bot', {
        description: 'Send a message from the bot. chatType is chat, private, command, or a type registered by a plugin (for example clan). private needs username. Set waitSeconds to collect chat replies that arrive after the send.',
        inputSchema: {
            botId: z.number().int(),
            message: z.string().min(1),
            chatType: z.string().optional().describe('chat, private, command, or a plugin chat type. Default chat'),
            username: z.string().optional().describe('Recipient for private'),
            waitSeconds: z.number().int().min(0).max(30).optional().describe('Wait this many seconds for replies'),
            replyFrom: z.string().optional(),
            replyContains: z.string().optional(),
        },
    }, wrap('send_message_to_bot', async ({ botId, message, chatType, username, waitSeconds = 0, replyFrom, replyContains }) => {
        const permErr = requirePermission(user, 'bot:interact');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        let type = chatType || 'chat';
        if (type === 'whisper') type = 'private';
        if (type === 'private' && !username) return err('private requires username');

        const since = new Date().toISOString();
        const result = botManager.sendMessageToBot(botId, message, type, username || null);
        if (!result.success) return err(result.message || 'Bot is not running');

        if (!waitSeconds) return ok({ ...result, chatType: type });

        const deadline = Date.now() + waitSeconds * 1000;
        let replies = [];
        while (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            const history = botHistoryStore.getChatHistory(botId, {
                from: since,
                username: replyFrom,
                search: replyContains,
                limit: 20,
            });
            replies = history.messages.filter((entry) => entry.timestamp >= since);
            if (replies.length > 0 && (replyFrom || replyContains)) break;
        }
        return ok({ ...result, chatType: type, replies });
    }));

    server.registerTool('get_chat_history', {
        description: 'Recent chat lines the bot has seen (player chat, whispers, clan and global when the server emits them). Newest first.',
        inputSchema: {
            botId: z.number().int(),
            limit: z.number().int().optional(),
            username: z.string().optional(),
            search: z.string().optional(),
            since: z.string().optional().describe('ISO timestamp'),
        },
    }, wrap('get_chat_history', async ({ botId, limit = 30, username, search, since }) => {
        const permErr = requirePermission(user, 'bot:history:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const history = botHistoryStore.getChatHistory(botId, {
            limit,
            username,
            search,
            from: since,
        });
        return ok(history);
    }));

    server.registerTool('get_bot_live_state', {
        description: 'Live Minecraft state: health, food, position, dimension, and online players. Empty if the bot is stopped.',
        inputSchema: { botId: z.number().int() },
    }, wrap('get_bot_live_state', async ({ botId }) => {
        const permErr = requirePermission(user, 'bot:list');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        return ok(await botManager.getLiveState(botId));
    }));

    server.registerTool('get_bot_logs', {
        description: "Read a bot's console history.",
        inputSchema: {
            botId: z.number().int(),
            limit: z.number().int().optional().describe('Max entries (default 100)'),
            offset: z.number().int().optional().describe('Pagination offset (default 0)'),
        },
    }, wrap('get_bot_logs', async ({ botId, limit = 100, offset = 0 }) => {
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const all = botManager.getBotLogs(botId) || [];
        const start = Math.max(0, offset);
        const end = start + limit;
        return ok({
            logs: all.slice(start, end),
            pagination: { total: all.length, limit, offset: start, hasMore: end < all.length },
        });
    }));

    server.registerTool('create_bot', {
        description: 'Create a bot on an existing server. Sets default User/Admin groups. Password is stored encrypted and is never returned.',
        inputSchema: {
            username: z.string().min(1).max(16),
            serverId: z.number().int(),
            password: z.string().optional(),
            prefix: z.string().max(8).optional(),
            note: z.string().optional(),
            owners: z.string().optional().describe('Comma-separated Minecraft usernames'),
            proxyId: z.number().int().optional(),
        },
    }, wrap('create_bot', async ({ username, serverId, password, prefix, note, owners, proxyId }) => {
        const permErr = requirePermission(user, 'bot:create');
        if (permErr) return permErr;

        const server = await prisma.server.findUnique({ where: { id: serverId } });
        if (!server) return err('Server not found');
        if (proxyId) {
            const proxy = await prisma.proxy.findUnique({ where: { id: proxyId } });
            if (!proxy) return err('Proxy not found');
        }

        const maxSortOrder = await prisma.bot.aggregate({ _max: { sortOrder: true } });
        try {
            const data = {
                username,
                serverId,
                password: password ? encrypt(password) : null,
                proxyId: proxyId || null,
                sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
            };
            if (prefix !== undefined) data.prefix = prefix;
            if (note !== undefined) data.note = note;
            if (owners !== undefined) data.owners = owners;
            const created = await prisma.bot.create({
                data,
                include: botInclude,
            });
            await setupDefaultPermissionsForBot(created.id);
            const panelUser = await prisma.panelUser.findUnique({ where: { id: user.userId } });
            if (panelUser && panelUser.allBots === false) {
                await prisma.panelUserBotAccess.create({
                    data: { userId: user.userId, botId: created.id },
                }).catch(() => {});
            }
            return ok(publicBot(created));
        } catch (error) {
            if (error.code === 'P2002') return err('A bot with this username already exists');
            throw error;
        }
    }));

    server.registerTool('update_bot', {
        description: 'Update bot settings: username, password, prefix, note, owners, server, or linked proxy. Omit a field to leave it unchanged. Pass proxyId null to detach the proxy. Password is never returned.',
        inputSchema: {
            botId: z.number().int(),
            username: z.string().min(1).max(16).optional(),
            password: z.string().optional(),
            prefix: z.string().max(8).optional(),
            note: z.string().nullable().optional(),
            owners: z.string().nullable().optional(),
            serverId: z.number().int().optional(),
            proxyId: z.number().int().nullable().optional(),
        },
    }, wrap('update_bot', async ({ botId, username, password, prefix, note, owners, serverId, proxyId }) => {
        const permErr = requirePermission(user, 'bot:update');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const data = {};
        if (username !== undefined) data.username = username;
        if (prefix !== undefined) data.prefix = prefix;
        if (note !== undefined) data.note = note;
        if (owners !== undefined) data.owners = owners;
        if (password) data.password = encrypt(password);
        if (serverId !== undefined) {
            const server = await prisma.server.findUnique({ where: { id: serverId } });
            if (!server) return err('Server not found');
            data.server = { connect: { id: serverId } };
        }
        if (proxyId !== undefined) {
            if (proxyId) {
                const proxy = await prisma.proxy.findUnique({ where: { id: proxyId } });
                if (!proxy) return err('Proxy not found');
                data.proxy = { connect: { id: proxyId } };
                data.proxyHost = null;
                data.proxyPort = null;
                data.proxyUsername = null;
                data.proxyPassword = null;
            } else {
                data.proxy = { disconnect: true };
                data.proxyHost = null;
                data.proxyPort = null;
                data.proxyUsername = null;
                data.proxyPassword = null;
            }
        }
        if (Object.keys(data).length === 0) return err('No fields to update');

        if (data.username) {
            const clash = await prisma.bot.findFirst({ where: { username: data.username, id: { not: botId } } });
            if (clash) return err('A bot with this username already exists');
        }

        const updated = await prisma.bot.update({
            where: { id: botId },
            data,
            include: botInclude,
        });
        botManager.reloadBotConfigInRealTime(botId);
        setTimeout(() => botManager.invalidateAllUserCache(botId), 500);
        return ok(publicBot(updated));
    }));

    server.registerTool('delete_bot', {
        description: 'Delete a stopped bot and its data. Refuses if the bot is still running.',
        inputSchema: { botId: z.number().int() },
    }, wrap('delete_bot', async ({ botId }) => {
        const permErr = requirePermission(user, 'bot:delete');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        if (botManager.isBotRunning(botId)) return err('Stop the bot before deleting it');
        await prisma.bot.delete({ where: { id: botId } });
        return ok({ success: true, botId });
    }));
}

module.exports = register;
