const path = require('path');
const fse = require('fs-extra');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const PluginStore = require('../plugins/PluginStore');
const { resolvePluginSettings, parseManifest } = require('./utils/pluginSettings');

class PluginHooks {
    constructor({ prisma } = {}) {
        if (!prisma) throw new Error('PluginHooks requires prisma.');
        this.prisma = prisma;
    }

    _clearRequireCache(pluginPath) {
        if (!pluginPath) return;
        const normalized = path.resolve(pluginPath);
        for (const key of Object.keys(require.cache)) {
            if (key.startsWith(normalized)) {
                delete require.cache[key];
            }
        }
    }

    async _loadPluginModule(pluginPath, mainFile = 'index.js') {
        const entryPointPath = path.join(pluginPath, mainFile);
        if (!await fse.pathExists(entryPointPath)) return null;

        const pluginRequire = createRequire(entryPointPath);
        this._clearRequireCache(pluginPath);

        try {
            return pluginRequire(entryPointPath);
        } catch (e) {
            if (e.code === 'ERR_REQUIRE_ESM' || /Cannot use import statement|Unexpected token 'export'/.test(e.message)) {
                const moduleUrl = pathToFileURL(entryPointPath).href;
                const esmModule = await import(moduleUrl);
                return esmModule && esmModule.default ? esmModule.default : esmModule;
            }
            throw e;
        }
    }

    async _invokeHook(pluginId, hookName, payloadExtras = {}) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {
            console.error(`[PluginHooks] Плагин ${pluginId} не найден`);
            return false;
        }

        try {
            const manifest = parseManifest(plugin);
            const mainFile = manifest.main || 'index.js';
            const pluginModule = await this._loadPluginModule(plugin.path, mainFile);

            if (!pluginModule || typeof pluginModule[hookName] !== 'function') {
                return true;
            }

            const settings = await resolvePluginSettings(plugin);
            const store = new PluginStore(this.prisma, plugin.botId, plugin.name);

            await pluginModule[hookName]({
                botId: plugin.botId,
                settings,
                store,
                prisma: this.prisma,
                ...payloadExtras,
            });

            this._clearRequireCache(plugin.path);
            return true;
        } catch (error) {
            console.error(`[PluginHooks] Ошибка выполнения ${hookName} для плагина ${plugin?.name}:`, error);
            return false;
        }
    }

    callOnEnable(pluginId) {
        return this._invokeHook(pluginId, 'onEnable');
    }

    callOnDisable(pluginId) {
        return this._invokeHook(pluginId, 'onDisable');
    }

    callOnUpdate(pluginId, oldVersion, newVersion) {
        return this._invokeHook(pluginId, 'onUpdate', { oldVersion, newVersion });
    }
}

module.exports = PluginHooks;
