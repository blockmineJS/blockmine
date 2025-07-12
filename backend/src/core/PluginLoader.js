
const path = require('path');
const fs = require('fs/promises');
const { execSync } = require('child_process');
const fssync = require('fs');

const projectRoot = path.resolve(__dirname, '..');

async function ensurePluginDependencies(pluginPath, pluginName) {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    try {
        if (fssync.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
            if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
                console.log(`[PluginLoader] У плагина ${pluginName} есть зависимости, устанавливаем их...`);
                try {
                    execSync('npm install', { 
                        cwd: pluginPath, 
                        stdio: 'pipe' 
                    });
                    console.log(`[PluginLoader] Зависимости для плагина ${pluginName} установлены`);
                } catch (installError) {
                    console.error(`[PluginLoader] Ошибка установки зависимостей для ${pluginName}:`, installError.message);
                }
            }
        }
    } catch (error) {
        console.error(`[PluginLoader] Ошибка чтения package.json для ${pluginName}:`, error.message);
    }
}

async function initializePlugins(bot, installedPlugins = []) {
    if (!installedPlugins || installedPlugins.length === 0) return;
    
    const sendLog = bot.sendLog || console.log;
    sendLog(`[PluginLoader] Загрузка ${installedPlugins.length} плагинов...`);

    for (const plugin of installedPlugins) {
        if (plugin && plugin.path) {
            try {
                await ensurePluginDependencies(plugin.path, plugin.name);

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
                
                try {
                    const pluginModule = require(normalizedPath);
                    
                    if (typeof pluginModule === 'function') {
                        pluginModule(bot, { settings: finalSettings });
                    } else if (pluginModule && typeof pluginModule.onLoad === 'function') {
                        pluginModule.onLoad(bot, { settings: finalSettings });
                    } else {
                        sendLog(`[PluginLoader] [ERROR] ${plugin.name} не экспортирует функцию или объект с методом onLoad.`);
                    }
                } catch (error) {
                    if (error.message.includes('Cannot find module')) {
                        const moduleMatch = error.message.match(/Cannot find module '([^']+)'/);
                        if (moduleMatch) {
                            const missingModule = moduleMatch[1];
                            sendLog(`[PluginLoader] Попытка установки недостающего модуля ${missingModule} в папку плагина ${plugin.name}`);
                            try {
                                execSync(`npm install ${missingModule}`, { 
                                    cwd: plugin.path, 
                                    stdio: 'pipe' 
                                });
                                sendLog(`[PluginLoader] Модуль ${missingModule} успешно установлен в папку плагина ${plugin.name}, повторная попытка загрузки`);
                                
                                // Повторная попытка загрузки
                                const pluginModule = require(normalizedPath);
                                if (typeof pluginModule === 'function') {
                                    pluginModule(bot, { settings: finalSettings });
                                } else if (pluginModule && typeof pluginModule.onLoad === 'function') {
                                    pluginModule.onLoad(bot, { settings: finalSettings });
                                }
                            } catch (installError) {
                                sendLog(`[PluginLoader] Не удалось установить модуль ${missingModule} в папку плагина ${plugin.name}: ${installError.message}`);
                                throw error; // Пробрасываем оригинальную ошибку
                            }
                        } else {
                            throw error;
                        }
                    } else {
                        throw error;
                    }
                }

            } catch (error) {
                sendLog(`[PluginLoader] [FATAL] Не удалось загрузить плагин ${plugin.name}: ${error.stack}`);
            }
        }
    }
}

module.exports = { initializePlugins };