const path = require('path');
const fs = require('fs/promises');
const fse = require('fs-extra');
const os = require('os');
const AdmZip = require('adm-zip');
const { assertArchiveLimits } = require('./zipSafe');

const PLUGINS_BASE_DIR = path.join(os.homedir(), '.blockmine', 'storage', 'plugins');

function httpError(message, statusCode = 400) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}

function parseImportZip(buffer) {
    let zip;
    try {
        zip = new AdmZip(buffer);
        zip.getEntries();
    } catch (e) {
        throw httpError('Загруженный файл не является корректным ZIP-архивом', 400);
    }
    assertArchiveLimits(zip);
    return zip;
}

function assertSafeUsername(username) {
    if (typeof username !== 'string' || username.trim().length === 0) {
        throw httpError('Имя бота обязательно', 400);
    }
    if (/[\\/\0]/.test(username) || username === '.' || username === '..' || username.includes('..')) {
        throw httpError(`Недопустимое имя бота: ${username}`, 400);
    }
}

function resolveSafePluginDir(botPluginsDir, pluginName) {
    if (typeof pluginName !== 'string' || pluginName.length === 0 || pluginName.includes('\0') || pluginName.includes('\\')) {
        throw httpError(`Недопустимое имя плагина: ${pluginName}`, 400);
    }
    const root = path.resolve(botPluginsDir);
    const dest = path.resolve(root, pluginName);
    if (dest !== root && !dest.startsWith(root + path.sep)) {
        throw httpError(`Недопустимое имя плагина (выход за пределы каталога): ${pluginName}`, 400);
    }
    return dest;
}

function readJsonEntry(zipEntries, name) {
    const entry = zipEntries.find(e => e.entryName === name);
    if (!entry) return null;
    return JSON.parse(entry.getData().toString('utf8'));
}

async function importPermissions(zipEntries, newBotId, prisma, setupDefaultPermissions) {
    await setupDefaultPermissions(newBotId, prisma);

    const pMap = new Map();
    const parsed = readJsonEntry(zipEntries, 'permissions.json');
    if (!parsed) return pMap;

    const users = Array.isArray(parsed.users) ? parsed.users : [];
    const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
    const permissions = Array.isArray(parsed.permissions) ? parsed.permissions : [];

    for (const p of permissions.filter(p => p.owner === 'system')) {
        const existing = await prisma.permission.findFirst({
            where: { botId: newBotId, name: p.name, owner: 'system' },
        });
        if (existing) pMap.set(p.id, existing.id);
    }
    for (const p of permissions.filter(p => p.owner !== 'system')) {
        const newP = await prisma.permission.create({
            data: { name: p.name, description: p.description ?? null, owner: p.owner ?? null, botId: newBotId },
        });
        pMap.set(p.id, newP.id);
    }

    const gMap = new Map();
    for (const g of groups.filter(g => g.owner === 'system')) {
        const existing = await prisma.group.findFirst({ where: { botId: newBotId, name: g.name } });
        if (existing) gMap.set(g.id, existing.id);
    }
    for (const g of groups.filter(g => g.owner !== 'system')) {
        const newG = await prisma.group.create({
            data: {
                name: g.name,
                owner: g.owner ?? null,
                botId: newBotId,
                permissions: {
                    create: (g.permissions || [])
                        .map(gp => ({ permissionId: pMap.get(gp.permissionId) }))
                        .filter(x => x.permissionId),
                },
            },
        });
        gMap.set(g.id, newG.id);
    }

    for (const u of users) {
        try {
            await prisma.user.create({
                data: {
                    username: u.username,
                    isBlacklisted: u.isBlacklisted ?? false,
                    botId: newBotId,
                    groups: {
                        create: (u.groups || [])
                            .map(ug => ({ groupId: gMap.get(ug.groupId) }))
                            .filter(x => x.groupId),
                    },
                },
            });
        } catch (e) {
            console.warn(`[Import] Пропущен пользователь ${u.username}: ${e.message}`);
        }
    }

    return pMap;
}

function resolveBotPluginsDir(username) {
    const baseResolved = path.resolve(PLUGINS_BASE_DIR);
    const botPluginsDir = path.resolve(path.join(PLUGINS_BASE_DIR, username));
    if (botPluginsDir !== baseResolved && !botPluginsDir.startsWith(baseResolved + path.sep)) {
        throw httpError('Недопустимое имя бота для каталога плагинов', 400);
    }
    return botPluginsDir;
}

async function importPlugins(zipEntries, newBot, prisma, pluginManager, botPluginsDir) {
    const pluginMap = new Map();
    const plugins = readJsonEntry(zipEntries, 'plugins.json');
    if (!plugins || !Array.isArray(plugins)) return pluginMap;

    await fs.mkdir(botPluginsDir, { recursive: true });

    for (const pluginData of plugins) {
        const oldPluginId = pluginData.id;
        const pluginName = pluginData.name;
        const newPluginPath = resolveSafePluginDir(botPluginsDir, pluginName);

        const prefix = `plugins/${pluginName}/`;
        for (const entry of zipEntries) {
            if (!entry.entryName.startsWith(prefix)) continue;
            const relativePath = entry.entryName.slice(prefix.length);
            if (!relativePath) continue;

            const destPath = path.resolve(newPluginPath, relativePath);
            if (destPath !== newPluginPath && !destPath.startsWith(newPluginPath + path.sep)) continue;
            if (entry.isDirectory) continue;

            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.writeFile(destPath, entry.getData());
        }

        const hasPackageJson = await fse.pathExists(path.join(newPluginPath, 'package.json'));
        let newPlugin = null;

        if (hasPackageJson) {
            try {
                await pluginManager._installDependencies(newPluginPath);
            } catch (e) {
                console.warn(`[Import] Не удалось установить зависимости для плагина ${pluginName}: ${e.message}`);
            }
            try {
                newPlugin = await pluginManager.registerPlugin(newBot.id, newPluginPath, 'LOCAL', `local:${pluginName}`, prisma);
            } catch (e) {
                console.warn(`[Import] registerPlugin не удался для плагина ${pluginName}: ${e.message}`);
            }
        }

        if (!newPlugin) {
            try {
                newPlugin = await prisma.installedPlugin.upsert({
                    where: { botId_name: { botId: newBot.id, name: pluginName } },
                    update: {},
                    create: {
                        botId: newBot.id,
                        name: pluginName,
                        version: pluginData.version || '0.0.0',
                        description: pluginData.description ?? null,
                        sourceType: pluginData.sourceType || 'LOCAL',
                        sourceUri: pluginData.sourceUri ?? null,
                        sourceRefType: pluginData.sourceRefType ?? null,
                        sourceRef: pluginData.sourceRef ?? null,
                        path: newPluginPath,
                        isEnabled: pluginData.isEnabled ?? true,
                        manifest: pluginData.manifest ?? null,
                        settings: pluginData.settings ?? '{}',
                    },
                });
            } catch (e) {
                console.warn(`[Import] Не удалось создать запись плагина ${pluginName}: ${e.message}`);
            }
        }

        if (newPlugin) {
            if (pluginData.settings && pluginData.settings !== '{}') {
                try {
                    await prisma.installedPlugin.update({
                        where: { id: newPlugin.id },
                        data: { settings: pluginData.settings },
                    });
                } catch (e) {
                    console.warn(`[Import] Не удалось применить настройки плагина ${pluginName}: ${e.message}`);
                }
            }
            if (oldPluginId != null) pluginMap.set(oldPluginId, newPlugin.id);
        }
    }

    return { pluginMap, botPluginsDir };
}

async function importPluginDataStore(zipEntries, newBotId, prisma) {
    const records = readJsonEntry(zipEntries, 'plugin_data_store.json');
    if (!records || !Array.isArray(records)) return;

    for (const r of records) {
        try {
            await prisma.pluginDataStore.create({
                data: { botId: newBotId, pluginName: r.pluginName, key: r.key, value: r.value },
            });
        } catch (e) {
            console.warn(`[Import] Пропущена запись PluginDataStore ${r.pluginName}/${r.key}: ${e.message}`);
        }
    }
}

async function importCommands(zipEntries, newBotId, prisma, pMap, pluginMap) {
    const commands = readJsonEntry(zipEntries, 'commands.json');
    if (!commands || !Array.isArray(commands)) return;

    for (const c of commands) {
        const permissionId = (c.permissionId != null && pMap.has(c.permissionId)) ? pMap.get(c.permissionId) : null;
        const pluginOwnerId = (c.pluginOwnerId != null && pluginMap.has(c.pluginOwnerId)) ? pluginMap.get(c.pluginOwnerId) : null;
        try {
            await prisma.command.create({
                data: {
                    botId: newBotId,
                    name: c.name,
                    isEnabled: c.isEnabled ?? true,
                    cooldown: c.cooldown ?? 0,
                    aliases: c.aliases ?? '[]',
                    description: c.description ?? null,
                    owner: c.owner ?? null,
                    permissionId,
                    allowedChatTypes: c.allowedChatTypes ?? '["chat", "private"]',
                    isVisual: c.isVisual ?? false,
                    argumentsJson: c.argumentsJson ?? '[]',
                    graphJson: c.graphJson ?? 'null',
                    pluginOwnerId,
                },
            });
        } catch (e) {
            console.warn(`[Import] Пропущена команда ${c.name}: ${e.message}`);
        }
    }
}

async function importEventGraphs(zipEntries, newBotId, prisma, pluginMap) {
    const graphs = readJsonEntry(zipEntries, 'event_graphs.json');
    if (!graphs || !Array.isArray(graphs)) return;

    for (const g of graphs) {
        const pluginOwnerId = (g.pluginOwnerId != null && pluginMap.has(g.pluginOwnerId)) ? pluginMap.get(g.pluginOwnerId) : null;
        const graphJson = g.graphJson ?? 'null';

        let eventTypes = [];
        try {
            const parsed = JSON.parse(graphJson);
            if (parsed && Array.isArray(parsed.nodes)) {
                const eventNodes = parsed.nodes.filter(n => n.type && n.type.startsWith('event:'));
                eventTypes = [...new Set(eventNodes.map(n => n.type.split(':')[1]))];
            }
        } catch (e) {
            console.warn(`[Import] Не удалось извлечь триггеры графа ${g.name}: ${e.message}`);
        }

        try {
            await prisma.eventGraph.create({
                data: {
                    botId: newBotId,
                    name: g.name,
                    isEnabled: g.isEnabled ?? true,
                    graphJson,
                    variables: g.variables ?? '[]',
                    pluginOwnerId,
                    triggers: { create: eventTypes.map(eventType => ({ eventType })) },
                },
            });
        } catch (e) {
            console.warn(`[Import] Пропущен граф событий ${g.name}: ${e.message}`);
        }
    }
}

async function importBotFromZip(zip, { config, prisma, pluginManager, setupDefaultPermissions }) {
    const zipEntries = zip.getEntries();

    const botData = readJsonEntry(zipEntries, 'bot.json');
    if (!botData) {
        throw httpError('В архиве отсутствует bot.json', 400);
    }

    const baseName = String(config.username || botData.username || '').trim();
    assertSafeUsername(baseName);

    let newBotName = baseName;
    if (config.autoRename) {
        let counter = 1;
        while (await prisma.bot.findFirst({ where: { username: newBotName } })) {
            newBotName = `${baseName}_imported_${counter}`;
            counter++;
        }
    }

    const createData = {
        username: newBotName,
        prefix: config.prefix ?? botData.prefix ?? '@',
        note: config.note ?? botData.note ?? null,
        owners: config.owners ?? botData.owners ?? '',
        serverId: config.serverId,
        proxyId: config.proxyId ?? null,
        proxyHost: config.proxyHost ?? null,
        proxyPort: config.proxyPort ?? null,
        proxyUsername: config.proxyUsername ?? null,
        password: config.password ?? null,
        proxyPassword: config.proxyPassword ?? null,
    };

    const botPluginsDir = resolveBotPluginsDir(newBotName);

    let newBot = null;
    try {
        newBot = await prisma.bot.create({ data: createData, include: { server: true } });

        const pMap = await importPermissions(zipEntries, newBot.id, prisma, setupDefaultPermissions);
        const pluginMap = await importPlugins(zipEntries, newBot, prisma, pluginManager, botPluginsDir);
        await importPluginDataStore(zipEntries, newBot.id, prisma);
        await importCommands(zipEntries, newBot.id, prisma, pMap, pluginMap);
        await importEventGraphs(zipEntries, newBot.id, prisma, pluginMap);

        return newBot;
    } catch (error) {
        if (newBot) {
            try {
                await prisma.bot.delete({ where: { id: newBot.id } });
            } catch (cleanupErr) {
                console.error(`[Import] Не удалось откатить частично созданного бота ${newBot.id}: ${cleanupErr.message}`);
            }
            if (botPluginsDir) {
                try {
                    await fse.remove(botPluginsDir);
                } catch (cleanupErr) {
                    console.error(`[Import] Не удалось удалить каталог плагинов ${botPluginsDir}: ${cleanupErr.message}`);
                }
            }
        }
        throw error;
    }
}

module.exports = {
    PLUGINS_BASE_DIR,
    parseImportZip,
    importBotFromZip,
    assertSafeUsername,
    resolveSafePluginDir,
    resolveBotPluginsDir,
    httpError,
};
