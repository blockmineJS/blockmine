const prismaService = require('./PrismaService');
const User = require('./UserService');

function createLiveGraphServices() {
    const prisma = prismaService.getClient();
    return {
        isIsolated: false,
        async tryWrite() {
            return null;
        },
        async getUser(username, botId) {
            if (!username || !botId) return null;
            return User.getUser(username, botId);
        },
        async readStore(botId, pluginName, key) {
            const row = await prisma.pluginDataStore.findUnique({
                where: { pluginName_botId_key: { pluginName, botId, key } },
            });
            if (!row) return null;
            try {
                return JSON.parse(row.value);
            } catch {
                return row.value;
            }
        },
    };
}

function createTestGraphServices(recordEffect, world = {}) {
    const store = new Map();
    const users = new Map();

    for (const player of world.players || []) {
        const username = String(player || '').trim();
        if (!username) continue;
        users.set(username.toLowerCase(), {
            username,
            isBlacklisted: false,
            groups: [],
            permissionsSet: new Set(),
        });
    }

    const note = (operation, summary) => {
        if (typeof recordEffect === 'function') {
            recordEffect({ kind: 'db_write', operation, summary: String(summary || operation) });
        }
    };

    return {
        isIsolated: true,
        async tryWrite(operation, summary, payload = {}) {
            if (operation === 'store_write') {
                store.set(`${payload.botId}:${payload.pluginName}:${payload.key}`, payload.value);
            }
            if (operation === 'set_blacklist') {
                const key = String(payload.username || '').toLowerCase();
                const user = users.get(key) || {
                    username: payload.username,
                    groups: [],
                    permissionsSet: new Set(),
                    isBlacklisted: false,
                };
                user.isBlacklisted = Boolean(payload.status);
                users.set(key, user);
            }
            if (operation === 'add_to_group' || operation === 'remove_from_group') {
                const key = String(payload.username || '').toLowerCase();
                const user = users.get(key) || {
                    username: payload.username,
                    groups: [],
                    permissionsSet: new Set(),
                    isBlacklisted: false,
                };
                if (operation === 'add_to_group' && !user.groups.some((group) => group.group?.name === payload.groupName)) {
                    user.groups.push({ group: { name: payload.groupName } });
                }
                if (operation === 'remove_from_group') {
                    user.groups = user.groups.filter((group) => group.group?.name !== payload.groupName);
                }
                users.set(key, user);
            }
            note(operation, summary);
            return { handled: true, id: payload.name ? `mem_${payload.name}` : null };
        },
        async getUser(username) {
            if (!username) return null;
            return users.get(String(username).toLowerCase()) || null;
        },
        async readStore(botId, pluginName, key) {
            return store.has(`${botId}:${pluginName}:${key}`)
                ? store.get(`${botId}:${pluginName}:${key}`)
                : null;
        },
    };
}

async function graphUser(context, username) {
    if (!username) return null;
    if (context?.services?.getUser) {
        return context.services.getUser(username, context.botId);
    }
    if (!context?.botId) return null;
    return User.getUser(username, context.botId);
}

async function tryGraphWrite(context, operation, summary, payload) {
    if (context?.services?.tryWrite) {
        return context.services.tryWrite(operation, summary, payload);
    }
    if (context?.__testMode) {
        context.recordEffect?.({ kind: 'db_write', operation, summary: String(summary || operation) });
        return { handled: true, id: null };
    }
    return null;
}

module.exports = {
    createLiveGraphServices,
    createTestGraphServices,
    graphUser,
    tryGraphWrite,
};
