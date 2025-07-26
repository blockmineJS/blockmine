
const path = require('path');
const fs = require('fs/promises');
const { execSync } = require('child_process');
const fssync = require('fs');
const PluginStore = require('../plugins/PluginStore');
const { deepMergeSettings } = require('./utils/settingsMerger');

const projectRoot = path.resolve(__dirname, '..');



async function initializePlugins(bot, installedPlugins = [], prisma) {
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
                
                const finalSettings = deepMergeSettings(defaultSettings, savedSettings);
                const store = new PluginStore(prisma, bot.config.id, plugin.name);
                
                const mainFile = manifest.main || 'index.js';
                const entryPointPath = path.join(plugin.path, mainFile);
                const normalizedPath = entryPointPath.replace(/\\/g, '/');
                
                sendLog(`[PluginLoader] Загрузка: ${plugin.name} (v${plugin.version}) из ${normalizedPath}`);
                
                try {
                    const pluginModule = require(normalizedPath);
                    
                    if (typeof pluginModule === 'function') {
                        pluginModule(bot, { settings: finalSettings, store });
                    } else if (pluginModule && typeof pluginModule.onLoad === 'function') {
                        pluginModule.onLoad(bot, { settings: finalSettings, store });
                    } else {
                        sendLog(`[PluginLoader] [ERROR] ${plugin.name} не экспортирует функцию или объект с методом onLoad.`);
                    }
                } catch (error) {
                    // Зависимости должны быть установлены заранее в PluginManager
                    // Если модуль не найден, это означает, что установка зависимостей не была выполнена корректно
                    if (error.message.includes('Cannot find module')) {
                        const moduleMatch = error.message.match(/Cannot find module '([^']+)'/);
                        if (moduleMatch) {
                            const missingModule = moduleMatch[1];
                            sendLog(`[PluginLoader] [ERROR] Модуль ${missingModule} не найден для плагина ${plugin.name}. Зависимости должны быть установлены заранее.`);
                        }
                    }
                    throw error;
                }

            } catch (error) {
                sendLog(`[PluginLoader] [FATAL] Не удалось загрузить плагин ${plugin.name}: ${error.stack}`);
            }
        }
    }
}

module.exports = { initializePlugins };