const { z } = require('zod');
const prisma = require('../../../lib/prisma');
const { botManager } = require('../../../core/services');
const { ok, err, wrap, requirePermission, requireBotAccess, jsonField } = require('../helpers');

function presentCommand(command) {
    return {
        ...command,
        aliases: jsonField(command.aliases, []),
        allowedChatTypes: jsonField(command.allowedChatTypes, []),
    };
}

async function ensureMinecraftUser(botId, username) {
    const name = String(username || '').trim();
    if (!name) return null;
    let record = await prisma.user.findFirst({ where: { botId, username: name } });
    if (!record) {
        record = await prisma.user.create({ data: { botId, username: name, isBlacklisted: false } });
    }
    return record;
}

async function invalidateUser(botId, username) {
    botManager.invalidateUserCache(botId, username);
}

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

    server.registerTool('update_bot_command', {
        description: 'Change a command: enabled, cooldown seconds, aliases, allowed chat types (chat, private), or the required permission name. Empty permissionName clears the permission.',
        inputSchema: {
            botId: z.number().int(),
            commandName: z.string().min(1),
            isEnabled: z.boolean().optional(),
            cooldown: z.number().int().min(0).optional(),
            aliases: z.array(z.string()).optional(),
            allowedChatTypes: z.array(z.string()).optional(),
            permissionName: z.string().nullable().optional(),
        },
    }, wrap('update_bot_command', async ({ botId, commandName, isEnabled, cooldown, aliases, allowedChatTypes, permissionName }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const command = await prisma.command.findFirst({ where: { botId, name: commandName } });
        if (!command) return err('Command not found');

        const data = {};
        if (typeof isEnabled === 'boolean') data.isEnabled = isEnabled;
        if (typeof cooldown === 'number') data.cooldown = cooldown;
        if (aliases) data.aliases = JSON.stringify(aliases);
        if (allowedChatTypes) data.allowedChatTypes = JSON.stringify(allowedChatTypes);
        if (permissionName !== undefined) {
            if (!permissionName) {
                data.permissionId = null;
            } else {
                const permission = await prisma.permission.findUnique({ where: { botId_name: { botId, name: permissionName } } });
                if (!permission) return err('Permission not found');
                data.permissionId = permission.id;
            }
        }
        if (Object.keys(data).length === 0) return err('No fields to update');

        const updated = await prisma.command.update({
            where: { id: command.id },
            data,
            include: { permission: true, pluginOwner: { select: { id: true, name: true } } },
        });
        botManager.reloadBotConfigInRealTime(botId);
        return ok(presentCommand(updated));
    }));

    server.registerTool('set_player_blacklist', {
        description: 'Blacklist or unblacklist a Minecraft player for this bot. Creates the player record if needed.',
        inputSchema: {
            botId: z.number().int(),
            username: z.string().min(1),
            isBlacklisted: z.boolean(),
        },
    }, wrap('set_player_blacklist', async ({ botId, username, isBlacklisted }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const record = await ensureMinecraftUser(botId, username);
        if (!record) return err('Username is required');
        const updated = await prisma.user.update({
            where: { id: record.id },
            data: { isBlacklisted },
        });
        await invalidateUser(botId, updated.username);
        return ok({ username: updated.username, isBlacklisted: updated.isBlacklisted });
    }));

    server.registerTool('add_player_to_group', {
        description: 'Add a Minecraft player to a bot group by group name. Creates the player record if needed.',
        inputSchema: {
            botId: z.number().int(),
            username: z.string().min(1),
            groupName: z.string().min(1),
        },
    }, wrap('add_player_to_group', async ({ botId, username, groupName }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const group = await prisma.group.findUnique({ where: { botId_name: { botId, name: groupName } } });
        if (!group) return err('Group not found');
        const record = await ensureMinecraftUser(botId, username);
        await prisma.userGroup.upsert({
            where: { userId_groupId: { userId: record.id, groupId: group.id } },
            create: { userId: record.id, groupId: group.id },
            update: {},
        });
        await invalidateUser(botId, record.username);
        return ok({ success: true, username: record.username, groupName });
    }));

    server.registerTool('remove_player_from_group', {
        description: 'Remove a Minecraft player from a bot group.',
        inputSchema: {
            botId: z.number().int(),
            username: z.string().min(1),
            groupName: z.string().min(1),
        },
    }, wrap('remove_player_from_group', async ({ botId, username, groupName }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const group = await prisma.group.findUnique({ where: { botId_name: { botId, name: groupName } } });
        if (!group) return err('Group not found');
        const record = await prisma.user.findFirst({ where: { botId, username } });
        if (!record) return err('Player not found');
        await prisma.userGroup.deleteMany({ where: { userId: record.id, groupId: group.id } });
        await invalidateUser(botId, record.username);
        return ok({ success: true, username: record.username, groupName });
    }));

    server.registerTool('create_bot_group', {
        description: 'Create a group on a bot. Optional permissionNames are attached if those permissions already exist or are created as admin-owned.',
        inputSchema: {
            botId: z.number().int(),
            name: z.string().min(1),
            permissionNames: z.array(z.string()).optional(),
        },
    }, wrap('create_bot_group', async ({ botId, name, permissionNames = [] }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const permissionIds = [];
        for (const permissionName of permissionNames) {
            const permission = await prisma.permission.upsert({
                where: { botId_name: { botId, name: permissionName } },
                update: {},
                create: { botId, name: permissionName, owner: 'admin' },
            });
            permissionIds.push(permission.id);
        }
        try {
            const group = await prisma.group.create({
                data: {
                    name,
                    botId,
                    owner: 'admin',
                    permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
                },
                include: { permissions: { include: { permission: true } } },
            });
            botManager.reloadBotConfigInRealTime(botId);
            return ok(group);
        } catch (error) {
            if (error.code === 'P2002') return err('Group already exists');
            throw error;
        }
    }));

    server.registerTool('grant_group_permission', {
        description: 'Give a permission to a group. Creates the permission if it does not exist. Players already in the group see the new right immediately.',
        inputSchema: {
            botId: z.number().int(),
            groupName: z.string().min(1),
            permissionName: z.string().min(1),
        },
    }, wrap('grant_group_permission', async ({ botId, groupName, permissionName }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const group = await prisma.group.findUnique({ where: { botId_name: { botId, name: groupName } } });
        if (!group) return err('Group not found');
        const permission = await prisma.permission.upsert({
            where: { botId_name: { botId, name: permissionName } },
            update: {},
            create: { botId, name: permissionName, owner: 'admin' },
        });
        await prisma.groupPermission.upsert({
            where: { groupId_permissionId: { groupId: group.id, permissionId: permission.id } },
            create: { groupId: group.id, permissionId: permission.id },
            update: {},
        });
        const members = await prisma.user.findMany({
            where: { botId, groups: { some: { groupId: group.id } } },
            select: { username: true },
        });
        for (const member of members) await invalidateUser(botId, member.username);
        botManager.reloadBotConfigInRealTime(botId);
        return ok({ success: true, groupName, permissionName });
    }));

    server.registerTool('revoke_group_permission', {
        description: 'Remove a permission from a group. Players in the group lose it immediately.',
        inputSchema: {
            botId: z.number().int(),
            groupName: z.string().min(1),
            permissionName: z.string().min(1),
        },
    }, wrap('revoke_group_permission', async ({ botId, groupName, permissionName }) => {
        const permErr = requirePermission(user, 'management:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const group = await prisma.group.findUnique({ where: { botId_name: { botId, name: groupName } } });
        if (!group) return err('Group not found');
        const permission = await prisma.permission.findUnique({ where: { botId_name: { botId, name: permissionName } } });
        if (!permission) return err('Permission not found');
        await prisma.groupPermission.deleteMany({ where: { groupId: group.id, permissionId: permission.id } });
        const members = await prisma.user.findMany({
            where: { botId, groups: { some: { groupId: group.id } } },
            select: { username: true },
        });
        for (const member of members) await invalidateUser(botId, member.username);
        botManager.reloadBotConfigInRealTime(botId);
        return ok({ success: true, groupName, permissionName });
    }));
}

module.exports = register;
