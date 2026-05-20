const { z } = require('zod');
const prisma = require('../../../lib/prisma');
const { botManager } = require('../../../core/services');
const { ok, err, wrap, requirePermission, requireBotAccess, getAllowedBotIds } = require('../helpers');

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
        return ok(bots);
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
        return ok(bot);
    }));

    server.registerTool('get_bot_states', {
        description: 'Get the running state of every bot (running/stopped, uptime, etc).',
        inputSchema: {},
    }, wrap('get_bot_states', async () => {
        return ok(botManager.getFullState());
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

        botManager.stopBot(botId);
        setTimeout(async () => {
            const botConfig = await prisma.bot.findUnique({
                where: { id: botId },
                include: { server: true, proxy: true },
            });
            if (botConfig) botManager.startBot(botConfig);
        }, 1000);
        return ok({ success: true, message: 'Restart command dispatched', botId });
    }));

    server.registerTool('send_message_to_bot', {
        description: 'Send a chat message from the bot. Ask the user which chat type to use when testing commands.',
        inputSchema: {
            botId: z.number().int(),
            message: z.string().min(1),
        },
    }, wrap('send_message_to_bot', async ({ botId, message }) => {
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const result = botManager.sendMessageToBot(botId, message);
        return ok(result);
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
}

module.exports = register;
