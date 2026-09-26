const { z } = require('zod');
const prisma = require('../../../lib/prisma');
const { botManager, pluginManager } = require('../../../core/services');
const PluginHooks = require('../../../core/PluginHooks');
const { filterSecretSettings, prepareSettingsForSave, isGroupedSettings } = require('../../../core/utils/secretsFilter');
const { ok, err, wrap, requirePermission, requireBotAccess, jsonField, hasPermission } = require('../helpers');

const CATALOG_URL = 'https://raw.githubusercontent.com/blockmineJS/official-plugins-list/main/index.json';

async function findPluginByName(botId, pluginName) {
    return prisma.installedPlugin.findFirst({
        where: { botId, name: pluginName },
        include: {
            commands: { select: { id: true, name: true, description: true, isEnabled: true, isVisual: true } },
            eventGraphs: { select: { id: true, name: true, isEnabled: true } },
        },
    });
}

function presentPlugin(plugin) {
    const manifest = jsonField(plugin.manifest, {});
    const settings = jsonField(plugin.settings, {});
    const manifestSettings = manifest.settings || {};
    const grouped = isGroupedSettings(manifestSettings);
    return {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        isEnabled: plugin.isEnabled,
        loadError: plugin.loadError || null,
        sourceType: plugin.sourceType,
        sourceUri: plugin.sourceUri,
        sourceRefType: plugin.sourceRefType,
        sourceRef: plugin.sourceRef,
        settings: filterSecretSettings(settings, manifestSettings, grouped) || {},
        settingsSchema: manifestSettings,
        commands: plugin.commands || [],
        eventGraphs: plugin.eventGraphs || [],
    };
}

function requireCatalogAccess(user) {
    if (hasPermission(user, 'plugin:browse') || hasPermission(user, 'plugin:list')) return null;
    return err('Permission denied', { required: 'plugin:browse' });
}

async function fetchCatalog() {
    const response = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

function register(server, { user }) {
    server.registerTool('get_bot_plugins', {
        description: 'List installed plugins for a bot.',
        inputSchema: { botId: z.number().int() },
    }, wrap('get_bot_plugins', async ({ botId }) => {
        const permErr = requirePermission(user, 'plugin:list');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const plugins = await prisma.installedPlugin.findMany({
            where: { botId },
            orderBy: { name: 'asc' },
            include: {
                commands: { select: { id: true, name: true, description: true, isEnabled: true, isVisual: true } },
            },
        });
        return ok(plugins.map(presentPlugin));
    }));

    server.registerTool('get_plugin_settings', {
        description: 'Get one plugin: masked settings, the settings schema from its manifest, commands, and source.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
        },
    }, wrap('get_plugin_settings', async ({ botId, pluginName }) => {
        const permErr = requirePermission(user, 'plugin:settings:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const plugin = await findPluginByName(botId, pluginName);
        if (!plugin) return err('Plugin not found');
        return ok(presentPlugin(plugin));
    }));

    server.registerTool('get_plugin_store', {
        description: 'Read entries from PluginDataStore (per-plugin KV).',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
            key: z.string().optional(),
        },
    }, wrap('get_plugin_store', async ({ botId, pluginName, key }) => {
        const permErr = requirePermission(user, 'plugin:settings:view');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const where = { botId, pluginName, ...(key ? { key } : {}) };
        const rows = await prisma.pluginDataStore.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
        });
        return ok(rows.map((r) => ({
            key: r.key,
            value: jsonField(r.value, r.value),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        })));
    }));

    server.registerTool('update_plugin_settings', {
        description: 'Update plugin settings. Pass a JSON object. Secret fields left as ******** keep their current value. Schema is in get_plugin_settings.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
            settings: z.string().describe('JSON-encoded settings object'),
        },
    }, wrap('update_plugin_settings', async ({ botId, pluginName, settings }) => {
        const permErr = requirePermission(user, 'plugin:settings:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        let parsed;
        try { parsed = JSON.parse(settings); } catch { return err('settings must be a JSON string'); }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return err('settings must decode to a JSON object');
        }

        const plugin = await findPluginByName(botId, pluginName);
        if (!plugin) return err('Plugin not found');

        const manifest = jsonField(plugin.manifest, {});
        const manifestSettings = manifest.settings || {};
        const grouped = isGroupedSettings(manifestSettings);
        const existing = jsonField(plugin.settings, {});
        const settingsToSave = prepareSettingsForSave(parsed, existing, manifestSettings, grouped);
        const updated = await prisma.installedPlugin.update({
            where: { id: plugin.id },
            data: { settings: JSON.stringify(settingsToSave) },
        });
        return ok({
            success: true,
            settings: filterSecretSettings(jsonField(updated.settings, {}), manifestSettings, grouped) || {},
        });
    }));

    server.registerTool('enable_disable_plugin', {
        description: 'Enable or disable a plugin. Fires onEnable/onDisable hooks when state changes.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
            isEnabled: z.boolean(),
        },
    }, wrap('enable_disable_plugin', async ({ botId, pluginName, isEnabled }) => {
        const permErr = requirePermission(user, 'plugin:settings:edit');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const plugin = await findPluginByName(botId, pluginName);
        if (!plugin) return err('Plugin not found');

        const wasEnabled = plugin.isEnabled;
        const updated = await prisma.installedPlugin.update({
            where: { id: plugin.id },
            data: { isEnabled },
        });

        if (wasEnabled !== isEnabled) {
            try {
                const hooks = new PluginHooks({ prisma });
                if (isEnabled) await hooks.callOnEnable(plugin.id);
                else await hooks.callOnDisable(plugin.id);
            } catch (e) {
                return ok({ success: true, isEnabled, warning: `Hook error: ${e.message}` });
            }
        }
        return ok({ success: true, isEnabled: updated.isEnabled });
    }));

    server.registerTool('install_local_plugin', {
        description: 'Install a plugin from an absolute path on disk (server-side path).',
        inputSchema: {
            botId: z.number().int(),
            path: z.string().min(1).describe('Absolute path to the plugin folder on the server'),
        },
    }, wrap('install_local_plugin', async ({ botId, path: pluginPath }) => {
        const permErr = requirePermission(user, 'plugin:install');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        const created = await pluginManager.installFromLocalPath(botId, pluginPath);
        return ok({ id: created.id, name: created.name, version: created.version, isEnabled: created.isEnabled });
    }));

    server.registerTool('list_plugin_catalog', {
        description: 'List plugins from the official BlockMine catalog.',
        inputSchema: {},
    }, wrap('list_plugin_catalog', async () => {
        const permErr = requireCatalogAccess(user);
        if (permErr) return permErr;
        const catalog = await fetchCatalog();
        return ok(catalog.map((item) => ({
            name: item.name,
            description: item.description,
            version: item.version,
            author: item.author,
            repoUrl: item.repoUrl,
            category: item.category,
        })));
    }));

    server.registerTool('get_catalog_plugin', {
        description: 'Get one catalog entry by plugin name, including description and repoUrl.',
        inputSchema: { name: z.string().min(1) },
    }, wrap('get_catalog_plugin', async ({ name }) => {
        const permErr = requireCatalogAccess(user);
        if (permErr) return permErr;
        const catalog = await fetchCatalog();
        const item = catalog.find((plugin) => plugin.name === name);
        if (!item) return err('Plugin not found in catalog');
        return ok(item);
    }));

    server.registerTool('install_plugin', {
        description: 'Install a plugin from a GitHub repo URL or from the official catalog by name. Reloads the bot plugins when install succeeds.',
        inputSchema: {
            botId: z.number().int(),
            repoUrl: z.string().optional().describe('https://github.com/owner/repo'),
            catalogName: z.string().optional().describe('Name from list_plugin_catalog'),
            tag: z.string().optional(),
        },
    }, wrap('install_plugin', async ({ botId, repoUrl, catalogName, tag }) => {
        const permErr = requirePermission(user, 'plugin:install');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;

        let resolvedUrl = repoUrl;
        if (!resolvedUrl && catalogName) {
            const catalog = await fetchCatalog();
            const item = catalog.find((plugin) => plugin.name === catalogName);
            if (!item?.repoUrl) return err('Plugin not found in catalog');
            resolvedUrl = item.repoUrl;
        }
        if (!resolvedUrl) return err('Provide repoUrl or catalogName');

        const created = await pluginManager.installFromGithub(botId, resolvedUrl, prisma, false, tag || null);
        return ok({ id: created.id, name: created.name, version: created.version, isEnabled: created.isEnabled });
    }));

    server.registerTool('uninstall_plugin', {
        description: 'Remove an installed plugin, its commands, and its files. Reloads the running bot afterwards.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
        },
    }, wrap('uninstall_plugin', async ({ botId, pluginName }) => {
        const permErr = requirePermission(user, 'plugin:delete');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const plugin = await prisma.installedPlugin.findFirst({ where: { botId, name: pluginName } });
        if (!plugin) return err('Plugin not found');
        await pluginManager.deletePlugin(plugin.id);
        if (botManager.isBotRunning(botId)) await botManager.reloadPlugins(botId);
        return ok({ success: true, name: pluginName });
    }));

    server.registerTool('update_installed_plugin', {
        description: 'Update a GitHub-sourced plugin to the latest tag, or to targetTag when given.',
        inputSchema: {
            botId: z.number().int(),
            pluginName: z.string().min(1),
            targetTag: z.string().optional(),
        },
    }, wrap('update_installed_plugin', async ({ botId, pluginName, targetTag }) => {
        const permErr = requirePermission(user, 'plugin:update');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const plugin = await prisma.installedPlugin.findFirst({ where: { botId, name: pluginName } });
        if (!plugin) return err('Plugin not found');
        const updated = await pluginManager.updatePlugin(plugin.id, targetTag || null, null);
        return ok({ id: updated.id, name: updated.name, version: updated.version });
    }));

    server.registerTool('check_plugin_updates', {
        description: 'Check which GitHub plugins on a bot have a newer version in the official catalog.',
        inputSchema: { botId: z.number().int() },
    }, wrap('check_plugin_updates', async ({ botId }) => {
        const permErr = requirePermission(user, 'plugin:update');
        if (permErr) return permErr;
        const accessErr = await requireBotAccess(user, botId);
        if (accessErr) return accessErr;
        const catalog = await fetchCatalog();
        const updates = await pluginManager.checkForUpdates(botId, catalog);
        return ok(updates);
    }));
}

module.exports = register;
