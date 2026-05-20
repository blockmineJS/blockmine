const { z } = require('zod');
const prisma = require('../../../lib/prisma');
const { pluginManager } = require('../../../core/services');
const PluginHooks = require('../../../core/PluginHooks');
const { ok, err, wrap, requirePermission, requireBotAccess, jsonField } = require('../helpers');

async function findPluginByName(botId, pluginName) {
    return prisma.installedPlugin.findFirst({ where: { botId, name: pluginName } });
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
        });
        return ok(plugins.map((p) => ({
            ...p,
            manifest: jsonField(p.manifest),
            settings: jsonField(p.settings, {}),
        })));
    }));

    server.registerTool('get_plugin_settings', {
        description: 'Get the saved settings JSON of one plugin (no manifest merging).',
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
        return ok({
            id: plugin.id,
            name: plugin.name,
            isEnabled: plugin.isEnabled,
            settings: jsonField(plugin.settings, {}),
            manifest: jsonField(plugin.manifest),
        });
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
        description: 'Replace plugin settings JSON. Pass a JSON-encoded object.',
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

        const updated = await prisma.installedPlugin.update({
            where: { id: plugin.id },
            data: { settings: JSON.stringify(parsed) },
        });
        return ok({ success: true, settings: jsonField(updated.settings, {}) });
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
        return ok(created);
    }));
}

module.exports = register;
