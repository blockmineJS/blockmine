const { z } = require('zod');
const prisma = require('../../../lib/prisma');
const { encrypt } = require('../../../core/utils/crypto');
const { ok, err, wrap, requirePermission, publicProxy } = require('../helpers');

function parsePort(port) {
    const value = port === undefined || port === null || port === '' ? 25565 : Number(port);
    if (!Number.isInteger(value) || value < 1 || value > 65535) return null;
    return value;
}

function register(server, { user }) {
    server.registerTool('list_servers', {
        description: 'List Minecraft servers configured in the panel (name, host, port, version).',
        inputSchema: {},
    }, wrap('list_servers', async () => {
        const permErr = requirePermission(user, 'server:list');
        if (permErr) return permErr;
        const servers = await prisma.server.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { bots: true } } },
        });
        return ok(servers.map((item) => ({
            id: item.id,
            name: item.name,
            host: item.host,
            port: item.port,
            version: item.version,
            botCount: item._count.bots,
        })));
    }));

    server.registerTool('create_server', {
        description: 'Create a Minecraft server record. Default port is 25565. Version is a Minecraft version string such as 1.20.1.',
        inputSchema: {
            name: z.string().min(1),
            host: z.string().min(1),
            version: z.string().min(1),
            port: z.number().int().optional(),
        },
    }, wrap('create_server', async ({ name, host, version, port }) => {
        const permErr = requirePermission(user, 'server:create');
        if (permErr) return permErr;
        const portNumber = parsePort(port);
        if (portNumber === null) return err('Port must be an integer from 1 to 65535');
        try {
            const created = await prisma.server.create({
                data: { name, host, port: portNumber, version },
            });
            return ok(created);
        } catch (error) {
            if (error.code === 'P2002') return err('A server with this name already exists');
            throw error;
        }
    }));

    server.registerTool('update_server', {
        description: 'Update a server name, host, port, or Minecraft version. Omit fields to leave them unchanged.',
        inputSchema: {
            serverId: z.number().int(),
            name: z.string().min(1).optional(),
            host: z.string().min(1).optional(),
            version: z.string().min(1).optional(),
            port: z.number().int().optional(),
        },
    }, wrap('update_server', async ({ serverId, name, host, version, port }) => {
        const permErr = requirePermission(user, 'server:create');
        if (permErr) return permErr;
        const data = {};
        if (name !== undefined) data.name = name;
        if (host !== undefined) data.host = host;
        if (version !== undefined) data.version = version;
        if (port !== undefined) {
            const portNumber = parsePort(port);
            if (portNumber === null) return err('Port must be an integer from 1 to 65535');
            data.port = portNumber;
        }
        if (Object.keys(data).length === 0) return err('No fields to update');
        if (data.name) {
            const clash = await prisma.server.findFirst({ where: { name: data.name, id: { not: serverId } } });
            if (clash) return err('A server with this name already exists');
        }
        const updated = await prisma.server.update({ where: { id: serverId }, data });
        return ok(updated);
    }));

    server.registerTool('delete_server', {
        description: 'Delete a server that has no bots attached.',
        inputSchema: { serverId: z.number().int() },
    }, wrap('delete_server', async ({ serverId }) => {
        const permErr = requirePermission(user, 'server:delete');
        if (permErr) return permErr;
        const botCount = await prisma.bot.count({ where: { serverId } });
        if (botCount > 0) return err(`Server is used by ${botCount} bot(s)`);
        await prisma.server.delete({ where: { id: serverId } });
        return ok({ success: true, serverId });
    }));

    server.registerTool('list_proxies', {
        description: 'List proxies without passwords, so a bot can be linked by proxyId.',
        inputSchema: {},
    }, wrap('list_proxies', async () => {
        const permErr = requirePermission(user, 'proxy:list');
        if (permErr) return permErr;
        const proxies = await prisma.proxy.findMany({ orderBy: { name: 'asc' } });
        return ok(proxies.map(publicProxy));
    }));

    server.registerTool('create_proxy', {
        description: 'Create a proxy. type is socks5 or http. Password is stored encrypted and is not returned.',
        inputSchema: {
            name: z.string().min(1),
            host: z.string().min(1),
            port: z.number().int(),
            type: z.enum(['socks5', 'http']).optional(),
            username: z.string().optional(),
            password: z.string().optional(),
            note: z.string().optional(),
        },
    }, wrap('create_proxy', async ({ name, host, port, type, username, password, note }) => {
        const permErr = requirePermission(user, 'proxy:create');
        if (permErr) return permErr;
        if (port < 1 || port > 65535) return err('Port must be from 1 to 65535');
        try {
            const created = await prisma.proxy.create({
                data: {
                    name,
                    host,
                    port,
                    type: type || 'socks5',
                    username: username || null,
                    password: password ? encrypt(password) : null,
                    note: note || null,
                },
            });
            return ok(publicProxy(created));
        } catch (error) {
            if (error.code === 'P2002') return err('A proxy with this name already exists');
            throw error;
        }
    }));

    server.registerTool('update_proxy', {
        description: 'Update a proxy. Omit fields to leave them unchanged. An empty password is ignored. The stored password is never returned.',
        inputSchema: {
            proxyId: z.number().int(),
            name: z.string().min(1).optional(),
            host: z.string().min(1).optional(),
            port: z.number().int().optional(),
            type: z.enum(['socks5', 'http']).optional(),
            username: z.string().nullable().optional(),
            password: z.string().optional(),
            note: z.string().nullable().optional(),
        },
    }, wrap('update_proxy', async ({ proxyId, name, host, port, type, username, password, note }) => {
        const permErr = requirePermission(user, 'proxy:create');
        if (permErr) return permErr;
        const data = {};
        if (name !== undefined) data.name = name;
        if (host !== undefined) data.host = host;
        if (type !== undefined) data.type = type;
        if (port !== undefined) {
            if (port < 1 || port > 65535) return err('Port must be from 1 to 65535');
            data.port = port;
        }
        if (username !== undefined) data.username = username || null;
        if (password) data.password = encrypt(password);
        if (note !== undefined) data.note = note || null;
        if (Object.keys(data).length === 0) return err('No fields to update');
        if (data.name) {
            const clash = await prisma.proxy.findFirst({ where: { name: data.name, id: { not: proxyId } } });
            if (clash) return err('A proxy with this name already exists');
        }
        const updated = await prisma.proxy.update({ where: { id: proxyId }, data });
        return ok(publicProxy(updated));
    }));

    server.registerTool('delete_proxy', {
        description: 'Delete a proxy that is not linked to any bot.',
        inputSchema: { proxyId: z.number().int() },
    }, wrap('delete_proxy', async ({ proxyId }) => {
        const permErr = requirePermission(user, 'proxy:delete');
        if (permErr) return permErr;
        const used = await prisma.bot.count({ where: { proxyId } });
        if (used > 0) return err(`Proxy is used by ${used} bot(s)`);
        await prisma.proxy.delete({ where: { id: proxyId } });
        return ok({ success: true, proxyId });
    }));
}

module.exports = register;
