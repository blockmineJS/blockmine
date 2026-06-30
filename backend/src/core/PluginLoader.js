const path = require('path');
const fs = require('fs/promises');
const fssync = require('fs');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const PluginStore = require('../plugins/PluginStore');
const { deepMergeSettings } = require('./utils/settingsMerger');
const { installDependencies, installSinglePackage, getPeerDependencies, isValidPackageName } = require('./utils/npmInstall');

const SYSTEM_LOG_PATTERNS = [
    /^\[Config\]/,
    /^\[System\]/,
    /^\[Internal\]/,
    /^\[Graph\]/,
    /\[Graph Log\]/,
];

async function ensurePluginDependencies(installedPlugins = [], sendLog = console.log) {
    if (!installedPlugins.length) return;

    sendLog(`[PluginLoader] Проверка зависимостей ${installedPlugins.length} плагинов...`);

    for (const plugin of installedPlugins) {
        if (!plugin?.path) continue;
        try {
            const packageJsonPath = path.join(plugin.path, 'package.json');
            if (!fssync.existsSync(packageJsonPath)) continue;

            const packageJson = JSON.parse(fssync.readFileSync(packageJsonPath, 'utf-8'));
            const hasDeps = packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0;
            if (!hasDeps) continue;

            const nodeModulesPath = path.join(plugin.path, 'node_modules');
            if (fssync.existsSync(nodeModulesPath)) continue;

            sendLog(`[PluginLoader] Установка зависимостей для ${plugin.name}...`);
            await installDependencies(plugin.path, { sendLog });
            sendLog(`[PluginLoader] ✓ Зависимости установлены для ${plugin.name}`);
        } catch (error) {
            sendLog(`[PluginLoader] [WARN] Не удалось проверить зависимости для ${plugin.name}: ${error.message}`);
        }
    }

    sendLog(`[PluginLoader] Проверка зависимостей завершена`);
}

function createPluginConsole(botId, pluginName, originalConsole) {
    const emitLog = (level, args) => {
        try {
            const message = args
                .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
                .join(' ');

            if (SYSTEM_LOG_PATTERNS.some((pattern) => pattern.test(message))) return;

            if (process.send) {
                process.send({
                    type: 'plugin-log',
                    log: {
                        botId,
                        pluginName,
                        level,
                        message,
                        source: 'plugin',
                        timestamp: Date.now(),
                    },
                });
            }
        } catch (error) {
            originalConsole.error(`[PluginLog] Error emitting log:`, error);
        }
    };

    const wrap = (level) => (...args) => {
        originalConsole[level === 'info' ? 'log' : level](`[${pluginName}]`, ...args);
        emitLog(level === 'log' ? 'info' : level, args);
    };

    return {
        log: wrap('log'),
        info: wrap('info'),
        warn: wrap('warn'),
        error: wrap('error'),
        debug: wrap('debug'),
    };
}

async function buildPluginDefaultSettings(plugin, manifest, sendLog) {
    const defaultSettings = {};
    if (!manifest.settings) return defaultSettings;

    for (const key of Object.keys(manifest.settings)) {
        const config = manifest.settings[key];
        if (config.type === 'json_file' && config.defaultPath) {
            const configFilePath = path.resolve(plugin.path, config.defaultPath);
            if (!isPathInside(path.resolve(plugin.path), configFilePath)) {
                sendLog(`[PluginLoader] WARN: defaultPath '${config.defaultPath}' выходит за пределы плагина ${plugin.name}, пропускаем.`);
                defaultSettings[key] = config.type === 'string[]' ? [] : {};
                continue;
            }
            try {
                const fileContent = await fs.readFile(configFilePath, 'utf-8');
                defaultSettings[key] = JSON.parse(fileContent);
            } catch {
                sendLog(`[PluginLoader] WARN: Не удалось прочитать defaultPath '${config.defaultPath}' для плагина ${plugin.name}.`);
                defaultSettings[key] = config.type === 'string[]' || config.type === 'json_file' ? [] : {};
            }
        } else {
            try {
                defaultSettings[key] = JSON.parse(config.default || 'null');
            } catch {
                defaultSettings[key] = config.default;
            }
        }
    }
    return defaultSettings;
}

async function loadPluginModule(entryPointPath, pluginRequire) {
    const normalizedPath = entryPointPath.replace(/\\/g, '/');
    try {
        return pluginRequire(normalizedPath);
    } catch (e) {
        if (e.code === 'ERR_REQUIRE_ESM' || /Cannot use import statement|Unexpected token 'export'|Unexpected identifier 'import'/.test(e.message)) {
            const moduleUrl = pathToFileURL(entryPointPath).href;
            const esmModule = await import(moduleUrl);
            return esmModule && esmModule.default ? esmModule.default : esmModule;
        }
        throw e;
    }
}

function invokePluginEntry(pluginModule, bot, pluginOptions, plugin, sendLog) {
    if (typeof pluginModule === 'function') {
        pluginModule(bot, pluginOptions);
    } else if (pluginModule && typeof pluginModule.onLoad === 'function') {
        pluginModule.onLoad(bot, pluginOptions);
    } else if (pluginModule?.default && typeof pluginModule.default === 'function') {
        pluginModule.default(bot, pluginOptions);
    } else if (pluginModule?.default && typeof pluginModule.default.onLoad === 'function') {
        pluginModule.default.onLoad(bot, pluginOptions);
    } else {
        sendLog(`[PluginLoader] [ERROR] ${plugin.name} не экспортирует функцию или объект с методом onLoad.`);
    }

    if (pluginModule?.exports && typeof pluginModule.exports === 'object' && bot.pluginRegistry) {
        bot.pluginRegistry.set(plugin.name, pluginModule.exports);
    } else if (pluginModule?.default?.exports && bot.pluginRegistry) {
        bot.pluginRegistry.set(plugin.name, pluginModule.default.exports);
    }
}

function clearRequireCacheForPath(targetPath) {
    if (!targetPath) return;
    const normalized = path.resolve(targetPath);
    const prefix = normalized + path.sep;
    for (const key of Object.keys(require.cache)) {
        if (key === normalized || key.startsWith(prefix)) {
            delete require.cache[key];
        }
    }
}

function isPathInside(parent, child) {
    const rel = path.relative(parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function trackEmitter(bot, emitter) {
    if (!emitter || emitter.__bmListenerTracked) return;
    if (typeof emitter.on !== 'function' || typeof emitter.removeListener !== 'function') return;
    emitter.__bmListenerTracked = true;
    for (const method of ['on', 'once', 'addListener', 'prependListener', 'prependOnceListener']) {
        const original = emitter[method];
        if (typeof original !== 'function') continue;
        emitter[method] = function (event, handler) {
            const active = bot.__activePluginCleanup;
            if (active && typeof handler === 'function') {
                active.listeners.push({ emitter, event, handler });
            }
            return original.call(this, event, handler);
        };
    }
}

async function teardownPreviousPlugins(bot) {
    const cleanups = bot.__pluginCleanups;
    if (!Array.isArray(cleanups) || cleanups.length === 0) return;
    const sendLog = bot.sendLog || console.log;

    for (const cleanup of cleanups.splice(0)) {
        for (const { emitter, event, handler } of cleanup.listeners) {
            try {
                emitter.removeListener(event, handler);
            } catch {
            }
        }
        try {
            const mod = cleanup.module;
            const onUnload = mod && typeof mod.onUnload === 'function'
                ? mod.onUnload
                : (mod && mod.default && typeof mod.default.onUnload === 'function' ? mod.default.onUnload : null);
            if (onUnload) {
                await onUnload({ botId: bot.config.id, bot });
            }
        } catch (error) {
            sendLog(`[PluginLoader] [WARN] Ошибка onUnload для ${cleanup.name}: ${error.message}`);
        }
        if (bot.pluginRegistry && cleanup.name) {
            try {
                bot.pluginRegistry.delete(cleanup.name);
            } catch {
            }
        }
    }
}

function extractMissingModule(errorMessage) {
    const match = errorMessage.match(/Cannot find module '([^']+)'/);
    return match ? match[1] : null;
}

function isFilePathLikeModule(name) {
    return (
        name.startsWith('/') ||
        name.startsWith('./') ||
        name.startsWith('../') ||
        name.startsWith('\\') ||
        /^[A-Za-z]:[\\/]/.test(name) ||
        /\.(js|json|node|ts|mjs|cjs)$/i.test(name)
    );
}

async function tryAutoInstallAndReload({ plugin, missingModule, pluginRequire, loadAndInit, sendLog }) {
    sendLog(`[PluginLoader] [WARN] Модуль ${missingModule} не найден для плагина ${plugin.name}. Пытаюсь установить автоматически...`);

    try {
        await installDependencies(plugin.path, { sendLog });
    } catch (error) {
        sendLog(`[PluginLoader] [ERROR] Не удалось установить зависимости: ${error.message}`);
        return false;
    }

    clearRequireCacheForPath(plugin.path);

    try {
        pluginRequire.resolve(missingModule);
        await loadAndInit();
        return true;
    } catch {
        sendLog(`[PluginLoader] [DEBUG] ${missingModule} всё ещё не резолвится после общего npm install.`);
    }

    if (!isValidPackageName(missingModule)) {
        sendLog(`[PluginLoader] [ERROR] Некорректное имя пакета: ${missingModule}`);
        return false;
    }

    try {
        sendLog(`[PluginLoader] [WARN] Адресная установка ${missingModule}...`);
        installSinglePackage(missingModule, plugin.path, { sendLog });
        clearRequireCacheForPath(plugin.path);

        const peers = getPeerDependencies(missingModule, plugin.path);
        if (peers.length > 0) {
            sendLog(`[PluginLoader] [INFO] Установка peerDependencies для ${missingModule}: ${peers.join(', ')}`);
            for (const peer of peers) {
                try {
                    installSinglePackage(peer, plugin.path, { sendLog, legacyPeerDeps: true });
                } catch (peerError) {
                    sendLog(`[PluginLoader] [WARN] Не удалось установить peer ${peer}: ${peerError.message}`);
                }
            }
        }

        pluginRequire.resolve(missingModule);
        await loadAndInit();
        return true;
    } catch (installError) {
        sendLog(`[PluginLoader] [ERROR] Адресная установка ${missingModule} не удалась: ${installError.message}`);
        return false;
    }
}

async function initializePlugins(bot, installedPlugins = [], prisma) {
    const sendLog = bot.sendLog || console.log;

    await teardownPreviousPlugins(bot);
    bot.__pluginCleanups = [];
    bot.__activePluginCleanup = null;
    trackEmitter(bot, bot);
    trackEmitter(bot, bot.events);

    if (!installedPlugins.length) return;

    sendLog(`[PluginLoader] Загрузка ${installedPlugins.length} плагинов...`);

    for (const plugin of installedPlugins) {
        if (!plugin?.path) continue;

        const cleanup = { name: plugin.name, listeners: [], module: null };

        try {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            const savedSettings = plugin.settings ? JSON.parse(plugin.settings) : {};
            const defaultSettings = await buildPluginDefaultSettings(plugin, manifest, sendLog);
            const finalSettings = deepMergeSettings(defaultSettings, savedSettings);
            const store = new PluginStore(prisma, bot.config.id, plugin.name);

            const mainFile = manifest.main || 'index.js';
            const entryPointPath = path.join(plugin.path, mainFile);
            const pluginRequire = createRequire(entryPointPath);

            const loadAndInit = async () => {
                clearRequireCacheForPath(plugin.path);
                const pluginModule = await loadPluginModule(entryPointPath, pluginRequire);
                cleanup.module = pluginModule;
                const pluginConsole = createPluginConsole(bot.config.id, plugin.name, global.console);
                bot.console = pluginConsole;
                const pluginOptions = { settings: finalSettings, store, console: pluginConsole };
                invokePluginEntry(pluginModule, bot, pluginOptions, plugin, sendLog);
            };

            sendLog(`[PluginLoader] Загрузка: ${plugin.name} (v${plugin.version})`);

            bot.__pluginCleanups.push(cleanup);
            bot.__activePluginCleanup = cleanup;
            try {
                try {
                    await loadAndInit();
                    emitLoadSuccess(bot, plugin);
                } catch (error) {
                    const errorString = `${error.message}\n${error.stack || ''}`;
                    if (!errorString.includes('Cannot find module')) throw error;

                    const missingModule = extractMissingModule(error.message);
                    if (!missingModule) {
                        sendLog(`[PluginLoader] [ERROR] Не удалось определить отсутствующий модуль для плагина ${plugin.name}.`);
                        throw error;
                    }
                    if (isFilePathLikeModule(missingModule)) {
                        sendLog(`[PluginLoader] [ERROR] Файл не найден: ${missingModule}`);
                        throw error;
                    }

                    const handled = await tryAutoInstallAndReload({
                        plugin,
                        missingModule,
                        pluginRequire,
                        loadAndInit,
                        sendLog,
                    });

                    if (!handled) throw error;
                    emitLoadSuccess(bot, plugin);
                }
            } finally {
                bot.__activePluginCleanup = null;
            }
        } catch (error) {
            bot.__activePluginCleanup = null;
            sendLog(`[PluginLoader] [FATAL] Не удалось загрузить плагин ${plugin.name}: ${error.stack}`);
        }
    }
}

function emitLoadSuccess(bot, plugin) {
    try {
        const { getIOSafe } = require('../real-time/socketHandler');
        const io = getIOSafe();
        if (!io) return;
        const room = `plugin-logs:${bot.config.id}:${plugin.name}`;
        io.to(room).emit('plugin-log', {
            botId: bot.config.id,
            pluginName: plugin.name,
            level: 'success',
            message: `✓ Плагин ${plugin.name} v${plugin.version} успешно загружен`,
            source: 'system',
            timestamp: Date.now(),
        });
    } catch {
    }
}

module.exports = { initializePlugins, ensurePluginDependencies };
