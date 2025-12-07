const path = require('path');
const fse = require('fs-extra');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const PluginStore = require('../plugins/PluginStore');

/**
 * Сервис для вызова хуков плагинов
 * Поддерживаемые хуки:
 * - onLoad(bot, options) - при загрузке плагина
 * - onUnload({ botId, prisma }) - при удалении плагина
 * - onEnable({ botId, settings, store, prisma }) - при включении плагина
 * - onDisable({ botId, settings, store, prisma }) - при выключении плагина
 * - onUpdate({ botId, oldVersion, newVersion, settings, store, prisma }) - при обновлении плагина
 */
class PluginHooks {
    constructor({ prisma }) {
        this.prisma = prisma;
    }

    /**
     * Загружает модуль плагина
     * @private
     */
    async _loadPluginModule(pluginPath, mainFile = 'index.js') {
        const entryPointPath = path.join(pluginPath, mainFile);

        if (!await fse.pathExists(entryPointPath)) {
            return null;
        }

        const pluginRequire = createRequire(entryPointPath);

        // Очищаем кэш для актуальной версии модуля
        try {
            const resolvedPath = require.resolve(entryPointPath);
            if (require.cache[resolvedPath]) {
                delete require.cache[resolvedPath];
            }
        } catch (e) {
            // Игнорируем ошибки очистки кэша
        }

        try {
            // Пробуем CommonJS
            return pluginRequire(entryPointPath);
        } catch (e) {
            if (e.code === 'ERR_REQUIRE_ESM' || /Cannot use import statement|Unexpected token 'export'/.test(e.message)) {
                // Пробуем ESM
                const moduleUrl = pathToFileURL(entryPointPath).href;
                const esmModule = await import(moduleUrl);
                return esmModule && esmModule.default ? esmModule.default : esmModule;
            }
            throw e;
        }
    }

    /**
     * Подготавливает настройки плагина
     * @private
     */
    _prepareSettings(plugin) {
        try {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            const savedSettings = plugin.settings ? JSON.parse(plugin.settings) : {};
            const defaultSettings = {};

            if (manifest.settings) {
                for (const key in manifest.settings) {
                    const config = manifest.settings[key];
                    try {
                        defaultSettings[key] = JSON.parse(config.default || 'null');
                    } catch {
                        defaultSettings[key] = config.default;
                    }
                }
            }

            // Мержим дефолтные с сохранёнными
            return { ...defaultSettings, ...savedSettings };
        } catch (e) {
            console.error(`[PluginHooks] Ошибка подготовки настроек:`, e);
            return {};
        }
    }

    /**
     * Вызывает хук onEnable при включении плагина
     * @param {number} pluginId - ID плагина
     * @returns {Promise<boolean>} - true если хук успешно выполнен
     */
    async callOnEnable(pluginId) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {
            console.error(`[PluginHooks] Плагин ${pluginId} не найден`);
            return false;
        }

        try {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            const mainFile = manifest.main || 'index.js';
            const pluginModule = await this._loadPluginModule(plugin.path, mainFile);

            if (!pluginModule || typeof pluginModule.onEnable !== 'function') {
                // Хук не определён - это нормально
                console.log(`[PluginHooks] Плагин ${plugin.name} не имеет хука onEnable`);
                return true;
            }

            const settings = this._prepareSettings(plugin);
            const store = new PluginStore(this.prisma, plugin.botId, plugin.name);

            console.log(`[PluginHooks] Вызов onEnable для плагина ${plugin.name}...`);

            await pluginModule.onEnable({
                botId: plugin.botId,
                settings,
                store,
                prisma: this.prisma
            });

            console.log(`[PluginHooks] Хук onEnable для ${plugin.name} успешно выполнен`);
            return true;
        } catch (error) {
            console.error(`[PluginHooks] Ошибка выполнения onEnable для ${plugin.name}:`, error);
            return false;
        }
    }

    /**
     * Вызывает хук onDisable при выключении плагина
     * @param {number} pluginId - ID плагина
     * @returns {Promise<boolean>} - true если хук успешно выполнен
     */
    async callOnDisable(pluginId) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {
            console.error(`[PluginHooks] Плагин ${pluginId} не найден`);
            return false;
        }

        try {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            const mainFile = manifest.main || 'index.js';
            const pluginModule = await this._loadPluginModule(plugin.path, mainFile);

            if (!pluginModule || typeof pluginModule.onDisable !== 'function') {
                // Хук не определён - это нормально
                console.log(`[PluginHooks] Плагин ${plugin.name} не имеет хука onDisable`);
                return true;
            }

            const settings = this._prepareSettings(plugin);
            const store = new PluginStore(this.prisma, plugin.botId, plugin.name);

            console.log(`[PluginHooks] Вызов onDisable для плагина ${plugin.name}...`);

            await pluginModule.onDisable({
                botId: plugin.botId,
                settings,
                store,
                prisma: this.prisma
            });

            console.log(`[PluginHooks] Хук onDisable для ${plugin.name} успешно выполнен`);
            return true;
        } catch (error) {
            console.error(`[PluginHooks] Ошибка выполнения onDisable для ${plugin.name}:`, error);
            return false;
        }
    }

    /**
     * Вызывает хук onUpdate при обновлении плагина
     * @param {number} pluginId - ID нового плагина
     * @param {string} oldVersion - старая версия
     * @param {string} newVersion - новая версия
     * @returns {Promise<boolean>} - true если хук успешно выполнен
     */
    async callOnUpdate(pluginId, oldVersion, newVersion) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {
            console.error(`[PluginHooks] Плагин ${pluginId} не найден`);
            return false;
        }

        try {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            const mainFile = manifest.main || 'index.js';
            const pluginModule = await this._loadPluginModule(plugin.path, mainFile);

            if (!pluginModule || typeof pluginModule.onUpdate !== 'function') {
                // Хук не определён - это нормально
                console.log(`[PluginHooks] Плагин ${plugin.name} не имеет хука onUpdate`);
                return true;
            }

            const settings = this._prepareSettings(plugin);
            const store = new PluginStore(this.prisma, plugin.botId, plugin.name);

            console.log(`[PluginHooks] Вызов onUpdate для плагина ${plugin.name} (${oldVersion} → ${newVersion})...`);

            await pluginModule.onUpdate({
                botId: plugin.botId,
                oldVersion,
                newVersion,
                settings,
                store,
                prisma: this.prisma
            });

            console.log(`[PluginHooks] Хук onUpdate для ${plugin.name} успешно выполнен`);
            return true;
        } catch (error) {
            console.error(`[PluginHooks] Ошибка выполнения onUpdate для ${plugin.name}:`, error);
            return false;
        }
    }
}

module.exports = PluginHooks;
