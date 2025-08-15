
const path = require('path');
const fs = require('fs/promises');
const { execSync } = require('child_process');
const fssync = require('fs');
const PluginStore = require('../plugins/PluginStore');
const { deepMergeSettings } = require('./utils/settingsMerger');
const { createRequire } = require('module');
const { execSync: execSyncRaw } = require('child_process');

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
                const pluginRequire = createRequire(entryPointPath);
                const { pathToFileURL } = require('url');

                const loadAndInit = async () => {
                    let pluginModule;
                    try {
                        pluginModule = pluginRequire(normalizedPath);
                    } catch (e) {
                        if (e.code === 'ERR_REQUIRE_ESM' || /Cannot use import statement|Unexpected token 'export'|Unexpected identifier 'import'/.test(e.message)) {
                            const moduleUrl = pathToFileURL(entryPointPath).href;
                            const esmModule = await import(moduleUrl);
                            pluginModule = esmModule && esmModule.default ? esmModule.default : esmModule;
                        } else {
                            throw e;
                        }
                    }

                    if (typeof pluginModule === 'function') {
                        pluginModule(bot, { settings: finalSettings, store });
                    } else if (pluginModule && typeof pluginModule.onLoad === 'function') {
                        pluginModule.onLoad(bot, { settings: finalSettings, store });
                    } else if (pluginModule && pluginModule.default && typeof pluginModule.default === 'function') {
                        pluginModule.default(bot, { settings: finalSettings, store });
                    } else if (pluginModule && pluginModule.default && typeof pluginModule.default.onLoad === 'function') {
                        pluginModule.default.onLoad(bot, { settings: finalSettings, store });
                    } else {
                        sendLog(`[PluginLoader] [ERROR] ${plugin.name} не экспортирует функцию или объект с методом onLoad.`);
                    }
                };

                sendLog(`[PluginLoader] Загрузка: ${plugin.name} (v${plugin.version}) из ${normalizedPath}`);
                
                try {
                    await loadAndInit();
                } catch (error) {
                    let handled = false;
                    let lastError = error;
                    if (error.message.includes('Cannot find module')) {
                        const moduleMatch = error.message.match(/Cannot find module '([^']+)'/);
                        const missingModule = moduleMatch ? moduleMatch[1] : null;
                        if (missingModule) {
                            try {
                                // Диагностика текущего состояния резолва
                                pluginRequire.resolve(missingModule);
                                sendLog(`[PluginLoader] [DEBUG] ${missingModule} уже резолвится до установки? Это неожиданно.`);
                            } catch {
                                sendLog(`[PluginLoader] [DEBUG] ${missingModule} не резолвится до установки.`);
                            }
                            sendLog(`[PluginLoader] [WARN] Модуль ${missingModule} не найден для плагина ${plugin.name}. Пытаюсь установить автоматически...`);
                            try {
                                // Сначала пробуем установить все зависимости из package.json плагина
                                try {
                                    execSync('npm install --omit=dev --no-audit --no-fund', { cwd: plugin.path, stdio: 'inherit' });
                                } catch (e1) {
                                    sendLog(`[PluginLoader] [WARN] npm install завершился с ошибкой, пробую с --legacy-peer-deps...`);
                                    execSync('npm install --omit=dev --legacy-peer-deps --no-audit --no-fund', { cwd: plugin.path, stdio: 'inherit' });
                                }
                                sendLog(`[PluginLoader] [INFO] Зависимости установлены. Повторная загрузка плагина ${plugin.name}...`);
                                // Очистим кэш require для файлов плагина перед повторной загрузкой
                                for (const key of Object.keys(require.cache)) {
                                    if (key.startsWith(plugin.path)) {
                                        delete require.cache[key];
                                    }
                                }
                                // Если конкретный модуль всё ещё не резолвится, попробуем точечно
                                let needTargetedInstall = false;
                                try {
                                    pluginRequire.resolve(missingModule);
                                    sendLog(`[PluginLoader] [DEBUG] ${missingModule} резолвится после общего npm install.`);
                                } catch {
                                    sendLog(`[PluginLoader] [DEBUG] ${missingModule} всё ещё не резолвится после общего npm install.`);
                                    needTargetedInstall = true;
                                }
                                if (needTargetedInstall) {
                                    throw new Error(`Cannot find module '${missingModule}' after npm install`);
                                }
                                await loadAndInit();
                                handled = true;
                            } catch (retryErr) {
                                lastError = retryErr;
                                // Если после общей установки модуль всё ещё отсутствует, пробуем поставить точечно
                                if (retryErr.message && retryErr.message.includes('Cannot find module') && missingModule) {
                                    try {
                                        sendLog(`[PluginLoader] [WARN] Повторная попытка: устанавливаю ${missingModule} адресно...`);
                                        // Простая валидация имени пакета для безопасности
                                        const safeName = /^[a-zA-Z0-9@_/\\.\-]+$/.test(missingModule) ? missingModule : null;
                                        if (!safeName) {
                                            throw new Error(`Некорректное имя пакета: ${missingModule}`);
                                        }
                                        try {
                                            execSync(`npm install ${safeName} --omit=dev --no-audit --no-fund`, { cwd: plugin.path, stdio: 'inherit' });
                                        } catch (e2) {
                                            sendLog(`[PluginLoader] [WARN] Адресная установка ${missingModule} завершилась с ошибкой, пробую с --legacy-peer-deps...`);
                                            execSync(`npm install ${safeName} --omit=dev --legacy-peer-deps --no-audit --no-fund`, { cwd: plugin.path, stdio: 'inherit' });
                                        }
                                        sendLog(`[PluginLoader] [INFO] Модуль ${missingModule} установлен. Повторная загрузка ${plugin.name}...`);
                                        for (const key of Object.keys(require.cache)) {
                                            if (key.startsWith(plugin.path)) {
                                                delete require.cache[key];
                                            }
                                        }
                                        // Если у пакета есть peerDependencies, установим их
                                        try {
                                            const out = execSyncRaw(`npm view ${safeName} peerDependencies --json`, { cwd: plugin.path });
                                            const text = String(out || '').trim();
                                            if (text && text !== 'null' && text !== 'undefined') {
                                                const peersObj = JSON.parse(text);
                                                const peers = Object.keys(peersObj || {});
                                                if (peers.length > 0) {
                                                    sendLog(`[PluginLoader] [INFO] Установка peerDependencies для ${missingModule}: ${peers.join(', ')}`);
                                                    const installLine = `npm install ${peers.join(' ')} --omit=dev --legacy-peer-deps --no-audit --no-fund`;
                                                    execSync(installLine, { cwd: plugin.path, stdio: 'inherit' });
                                                }
                                            }
                                        } catch (peerErr) {
                                            sendLog(`[PluginLoader] [WARN] Не удалось получить/установить peerDependencies для ${missingModule}: ${peerErr.message}`);
                                        }
                                        // Проверим, что модуль теперь доступен
                                        try {
                                            const paths = pluginRequire.resolve.paths ? pluginRequire.resolve.paths(missingModule) : [];
                                            sendLog(`[PluginLoader] [DEBUG] Пути резолва для ${missingModule}: ${JSON.stringify(paths)}`);
                                            pluginRequire.resolve(missingModule);
                                        } catch (rErr) {
                                            sendLog(`[PluginLoader] [ERROR] ${missingModule} всё ещё не резолвится после адресной установки: ${rErr.message}`);
                                            throw rErr;
                                        }
                                        sendLog(`[PluginLoader] [DEBUG] ${missingModule} резолвится после адресной установки.`);
                                        await loadAndInit();
                                        handled = true;
                                    } catch (installErr) {
                                        lastError = installErr;
                                        sendLog(`[PluginLoader] [ERROR] Автоустановка модуля ${missingModule} для ${plugin.name} не удалась: ${installErr.message}`);
                                    }
                                } else {
                                    sendLog(`[PluginLoader] [ERROR] Не удалось автоматически установить зависимости для ${plugin.name}: ${retryErr.message}`);
                                }
                            }
                        } else {
                            sendLog(`[PluginLoader] [ERROR] Не удалось определить отсутствующий модуль для плагина ${plugin.name}.`);
                        }
                    }
                    if (!handled) {
                        throw lastError;
                    }
                }

            } catch (error) {
                sendLog(`[PluginLoader] [FATAL] Не удалось загрузить плагин ${plugin.name}: ${error.stack}`);
            }
        }
    }
}

module.exports = { initializePlugins };