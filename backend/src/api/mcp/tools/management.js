const { z } = require('zod');
const prisma = require('../../../lib/prisma');
const { ok, err, wrap, requirePermission, requireBotAccess, jsonField } = require('../helpers');

function register(server, { user }) {
    server.registerTool('get_bot_users', {
        description: 'Paginated list of users known to a bot, with their groups.',
        inputSchema: {
            botId: z.number().int(),
            search: z.string().optional().describe('Filter by username substring'),
            page: z.number().int().optional(),
            pageSize: z.number().int().optional().describe('Default 100'),
        },
    }, wrap('get_bot_users', async ({ botId, search, page = 1, pageSize = 100 }) => {
        const permErr = requirePermission(user, 'management:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const where = { botId, ...(search ? { username: { contains: search } } : {}) };
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: { groups: { include: { group: true } } },
                orderBy: { username: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.user.count({ where }),
        ]);
        return ok({ items: users, total, page, pageSize });
    }));

    server.registerTool('get_user_info', {
        description: 'Full info for a single user, including groups and their permissions.',
        inputSchema: {
            botId: z.number().int(),
            username: z.string().min(1),
        },
    }, wrap('get_user_info', async ({ botId, username }) => {
        const permErr = requirePermission(user, 'management:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const found = await prisma.user.findFirst({
            where: { botId, username },
            include: {
                groups: {
                    include: {
                        group: {
                            include: {
                                permissions: { include: { permission: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!found) return err('User not found');
        return ok(found);
    }));

    server.registerTool('get_bot_groups', {
        description: 'All groups for a bot with permissions and member usernames.',
        inputSchema: { botId: z.number().int() },
    }, wrap('get_bot_groups', async ({ botId }) => {
        const permErr = requirePermission(user, 'management:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const groups = await prisma.group.findMany({
            where: { botId },
            include: {
                permissions: { include: { permission: true } },
                users: { include: { user: { select: { id: true, username: true, isBlacklisted: true } } } },
            },
            orderBy: { name: 'asc' },
        });
        return ok(groups);
    }));

    server.registerTool('get_bot_permissions', {
        description: 'All permissions defined for a bot.',
        inputSchema: { botId: z.number().int() },
    }, wrap('get_bot_permissions', async ({ botId }) => {
        const permErr = requirePermission(user, 'management:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const permissions = await prisma.permission.findMany({
            where: { botId },
            orderBy: { name: 'asc' },
        });
        return ok(permissions);
    }));

    server.registerTool('get_bot_commands', {
        description: 'All commands for a bot with metadata (aliases, cooldown, permission, plugin owner).',
        inputSchema: {
            botId: z.number().int(),
            search: z.string().optional(),
            page: z.number().int().optional(),
            pageSize: z.number().int().optional().describe('Default 100'),
        },
    }, wrap('get_bot_commands', async ({ botId, search, page = 1, pageSize = 100 }) => {
        const permErr = requirePermission(user, 'management:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const where = { botId, ...(search ? { name: { contains: search } } : {}) };
        const [commands, total] = await Promise.all([
            prisma.command.findMany({
                where,
                include: {
                    permission: true,
                    pluginOwner: { select: { id: true, name: true, version: true } },
                },
                orderBy: { name: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.command.count({ where }),
        ]);
        return ok({
            items: commands.map((c) => ({
                ...c,
                aliases: jsonField(c.aliases, []),
                allowedChatTypes: jsonField(c.allowedChatTypes, []),
            })),
            total,
            page,
            pageSize,
        });
    }));
}

module.exports = register;
