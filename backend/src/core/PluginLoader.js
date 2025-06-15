
const path = require('path');
const fs = require('fs/promises');

async function initializePlugins(bot, installedPlugins = []) {
    if (!installedPlugins || installedPlugins.length === 0) return;
    
    const sendLog = bot.sendLog || console.log;
    sendLog(`[PluginLoader] Загрузка ${installedPlugins.length} плагинов...`);

    for (const plugin of installedPlugins) {
        if (plugin && plugin.path) {
            try {
                const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
                const savedSettings = plugin.settings ? JSON.parse(plugin.settings) : {};
                const defaultSettings = {};

                if (manifest.settings) {
                    for (const key in manifest.settings) {
                        const config = manifest.settings[key];
                        if (config.type === 'json_file' && config.defaultPath) {
                            const configFilePath = path.join(plugin.path, config.defaultPath);
                            try {
                                const fileContent = await fs.readFile(configFilePath, 'utf-8');
                                defaultSettings[key] = JSON.parse(fileContent);
                            } catch (e) {
                                sendLog(`[PluginLoader] WARN: Не удалось прочитать defaultPath '${config.defaultPath}' для плагина ${plugin.name}.`);
                                defaultSettings[key] = (config.type === 'string[]' || config.type === 'json_file') ? [] : {};
                            }
                        } else {
                            try {
                                defaultSettings[key] = JSON.parse(config.default || 'null');
                            } catch {
                                defaultSettings[key] = config.default;
                            }
                        }
                    }
                }
                
                const finalSettings = { ...defaultSettings, ...savedSettings };
                
                const mainFile = manifest.main || 'index.js';
                const entryPointPath = path.join(plugin.path, mainFile);
                const normalizedPath = entryPointPath.replace(/\\/g, '/');
                
                sendLog(`[PluginLoader] Загрузка: ${plugin.name} (v${plugin.version}) из ${normalizedPath}`);
                const pluginModule = require(normalizedPath);
                
                if (typeof pluginModule === 'function') {
                    pluginModule(bot, { settings: finalSettings });
                } else if (pluginModule && typeof pluginModule.onLoad === 'function') {
                    pluginModule.onLoad(bot, { settings: finalSettings });
                } else {
                    sendLog(`[PluginLoader] [ERROR] ${plugin.name} не экспортирует функцию или объект с методом onLoad.`);
                }

            } catch (error) {
                sendLog(`[PluginLoader] [FATAL] Не удалось загрузить плагин ${plugin.name}: ${error.stack}`);
            }
        }
    }
}

module.exports = { initializePlugins };