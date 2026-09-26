const path = require('path');
const fse = require('fs-extra');
const os = require('os');
const AdmZip = require('adm-zip');
const semver = require('semver');
const PluginHooks = require('./PluginHooks');
const {
    tryParseGithubRepoUrl,
    normalizeGithubRepoUrl,
    tryNormalizeGithubRepoUrl,
    getGithubRepoName,
    fetchGithubRepoInfo,
    downloadGithubArchive,
    fetchGithubPackageVersion,
    fetchLatestGithubVersionTag,
} = require('./utils/github');
const { installDependencies } = require('./utils/npmInstall');
const { assertSafeZip, assertArchiveLimits } = require('./utils/zipSafe');
const TtlCache = require('./utils/ttlCache');
const { pluginDependencySatisfied, diffSettings, listDeclaredPermissions, ensureDeclaredPermissions } = require('./utils/pluginManifest');

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const PLUGINS_BASE_DIR = path.join(DATA_DIR, 'storage', 'plugins');

function isPathInside(parent, child) {
    const rel = path.relative(parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function sanitizePluginDirName(name) {
    const cleaned = String(name || '').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^\.+/, '');
    return cleaned || 'plugin';
}

function httpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function readExportedSettings(pluginDir) {
    const settingsPath = path.join(pluginDir, 'blockmine-settings.json');
    if (!await fse.pathExists(settingsPath)) return null;
    const raw = await fse.readFile(settingsPath, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw httpError('Файл настроек в архиве повреждён.', 400);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw httpError('Файл настроек в архиве должен быть объектом.', 400);
    }
    await fse.remove(settingsPath);
    return JSON.stringify(parsed);
}

async function findPluginRoot(rootDir) {
    if (await fse.pathExists(path.join(rootDir, 'package.json'))) {
        return rootDir;
    }

    const entries = await fse.readdir(rootDir, { withFileTypes: true });
    const matches = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === '__MACOSX' || entry.name === 'node_modules' || entry.name === '.git') continue;
        const candidate = path.join(rootDir, entry.name);
        if (await fse.pathExists(path.join(candidate, 'package.json'))) {
            matches.push(candidate);
        }
    }

    if (matches.length === 1) return matches[0];
    return null;
}

async function appendPluginFiles(archive, directory, relativeDir = '') {
    const entries = await fse.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        if (!relativeDir && entry.name === 'blockmine-settings.json') continue;
        const absolutePath = path.join(directory, entry.name);
        const entryName = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
            await appendPluginFiles(archive, absolutePath, entryName);
            continue;
        }
        if (entry.isFile()) {
            archive.file(absolutePath, { name: entryName });
        }
    }
}

const TELEMETRY_ENABLED = process.env.BLOCKMINE_TELEMETRY !== 'false';
const STATS_SERVER_URL = process.env.STATS_SERVER_URL || 'http://185.65.200.184:3000';

const LATEST_TAG_TTL_MS = 30 * 60 * 1000;
const LATEST_VERSION_TTL_MS = 30 * 60 * 1000;

function reportPluginDownload(pluginName) {
    if (!TELEMETRY_ENABLED) return;

    fetch(`${STATS_SERVER_URL}/api/plugins/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plugin_name: pluginName }),
    })
        .then((res) => {
            if (!res.ok) {
                console.error(`[Telemetry] Сервер статистики вернул ошибку для плагина ${pluginName}: ${res.statusText}`);
            }
        })
        .catch((error) => {
            const { isConnectTimeout } = require('./utils/networkError');
            if (isConnectTimeout(error)) return;
            console.error(`[Telemetry] Не удалось отправить статистику по плагину ${pluginName}: ${error.message}`);
        });
}

async function safeRemove(targetPath) {
    if (!targetPath) return;
    try {
        if (await fse.pathExists(targetPath)) {
            await fse.remove(targetPath);
        }
    } catch (error) {
        console.warn(`[PluginManager] Не удалось удалить ${targetPath}: ${error.message}`);
    }
}

class PluginManager {
    constructor({ botManager, prisma } = {}) {
        if (!prisma) {
            throw new Error('PluginManager requires a prisma client.');
        }
        this.botManager = botManager;
        this.prisma = prisma;
        this.latestTagCache = new TtlCache({ ttlMs: LATEST_TAG_TTL_MS, cleanupIntervalMs: 5 * 60 * 1000, maxSize: 500 });
        this.latestVersionCache = new TtlCache({ ttlMs: LATEST_VERSION_TTL_MS, cleanupIntervalMs: 5 * 60 * 1000, maxSize: 500 });
        this.ensureBaseDirExists();
    }

    async ensureBaseDirExists() {
        await fse.mkdir(PLUGINS_BASE_DIR, { recursive: true }).catch(console.error);
    }

    async checkPluginDependencies(botId, packageJson) {
        const result = { isValid: true, missing: [], warnings: [] };
        const pluginDeps = packageJson.botpanel?.dependencies || {};
        if (Object.keys(pluginDeps).length === 0) return result;

        const installedPlugins = await this.prisma.installedPlugin.findMany({
            where: { botId },
            select: { name: true, version: true },
        });
        const installedMap = new Map(installedPlugins.map((p) => [p.name, p.version]));

        for (const [depName, depVersion] of Object.entries(pluginDeps)) {
            if (!installedMap.has(depName)) {
                result.missing.push(`${depName} (требуется ${depVersion})`);
                result.isValid = false;
                continue;
            }
            const installedVersion = installedMap.get(depName);
            if (!pluginDependencySatisfied(installedVersion, depVersion)) {
                result.missing.push(`${depName} (установлена ${installedVersion}, требуется ${depVersion})`);
                result.isValid = false;
            }
        }

        return result;
    }

    async _installDependencies(pluginPath, hooks = {}) {
        try {
            await installDependencies(pluginPath, {
                sendLog: (msg) => console.log(`[PluginManager] ${msg}`),
                onWait: hooks.onWait,
            });
        } catch (error) {
            console.error(`[PluginManager] Ошибка при установке зависимостей в ${pluginPath}:`, error);
            throw new Error('Не удалось установить зависимости плагина.');
        }
    }

    async _logDependencyWarnings(botId, packageJson) {
        const depCheck = await this.checkPluginDependencies(botId, packageJson);
        if (!depCheck.isValid) {
            const missingList = depCheck.missing.join(', ');
            console.warn(`[PluginManager] Плагин ${packageJson.name} требует: ${missingList}`);
            console.warn('[PluginManager] Плагин будет установлен, но может работать некорректно без зависимостей.');
        }
        depCheck.warnings.forEach((w) => console.warn(`[PluginManager] ${w}`));
    }

    async installFromLocalPath(botId, directoryPath, settingsJson = null) {
        if (typeof directoryPath !== 'string' || !directoryPath.trim()) {
            throw new Error('Не указан путь к директории плагина.');
        }

        let realSource;
        try {
            realSource = await fse.realpath(directoryPath);
        } catch (e) {
            throw new Error('Директория плагина не найдена.');
        }

        const stat = await fse.stat(realSource);
        if (!stat.isDirectory()) {
            throw new Error('Указанный путь не является директорией.');
        }

        const packageJsonPath = path.join(realSource, 'package.json');
        if (!await fse.pathExists(packageJsonPath)) {
            throw new Error('В указанной директории отсутствует package.json.');
        }
        const packageJson = JSON.parse(await fse.readFile(packageJsonPath, 'utf-8'));
        if (!packageJson.name || !packageJson.version) {
            throw new Error('package.json не содержит обязательных полей name и version.');
        }

        await this._logDependencyWarnings(botId, packageJson);

        const botPluginsDir = path.join(PLUGINS_BASE_DIR, `bot_${botId}`);
        await fse.mkdir(botPluginsDir, { recursive: true });
        const realBase = await fse.realpath(PLUGINS_BASE_DIR);

        let managedPath;
        if (isPathInside(realBase, realSource)) {
            managedPath = realSource;
        } else {
            managedPath = path.join(botPluginsDir, sanitizePluginDirName(packageJson.name));
            if (await fse.pathExists(managedPath)) {
                await fse.remove(managedPath);
            }
            await fse.copy(realSource, managedPath, {
                filter: (src) => {
                    const base = path.basename(src);
                    return base !== 'node_modules' && base !== '.git' && base !== 'blockmine-settings.json';
                },
            });
        }

        const preexisting = await this.prisma.installedPlugin
            .findUnique({ where: { botId_name: { botId, name: packageJson.name } } })
            .catch(() => null);
        const wasNew = !preexisting;

        const newPlugin = await this.registerPlugin(botId, managedPath, 'LOCAL', `local:${packageJson.name}`);
        if (settingsJson != null) {
            await this.prisma.installedPlugin.update({
                where: { id: newPlugin.id },
                data: { settings: settingsJson },
            });
            newPlugin.settings = settingsJson;
        }

        try {
            reportPluginDownload(packageJson.name);
        } catch (e) {
            console.error('Не удалось отправить статистику по локальному плагину', e?.message);
        }

        try {
            await this._installDependencies(managedPath);
            await this.loadPluginGraphs(botId, newPlugin.id, managedPath);

            if (this.botManager) {
                await this.botManager.reloadPlugins(botId);
            }
        } catch (error) {
            if (wasNew) {
                await this.prisma.installedPlugin.delete({ where: { id: newPlugin.id } }).catch(() => {});
                if (managedPath !== realSource && managedPath.startsWith(PLUGINS_BASE_DIR)) {
                    await safeRemove(managedPath);
                }
            }
            throw error;
        }

        return newPlugin;
    }

    async getInstalledPluginDirectory(botId, pluginId) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: Number(pluginId) } });
        if (!plugin || plugin.botId !== Number(botId)) {
            throw httpError('Плагин не найден', 404);
        }

        let realPath;
        try {
            realPath = await fse.realpath(plugin.path);
        } catch {
            throw httpError('Файлы плагина не найдены', 404);
        }

        const stat = await fse.stat(realPath);
        if (!stat.isDirectory()) {
            throw httpError('Файлы плагина не найдены', 404);
        }

        const botDir = path.join(PLUGINS_BASE_DIR, `bot_${Number(botId)}`);
        const realBotDir = await fse.realpath(botDir);
        if (!isPathInside(realBotDir, realPath)) {
            throw httpError('Файлы плагина недоступны', 400);
        }

        return {
            plugin,
            directory: realPath,
            filename: `${sanitizePluginDirName(plugin.name)}.zip`,
        };
    }

    async writePluginZip(directory, outputStream, settingsJson = null) {
        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 9 } });
        const failed = new Promise((_, reject) => {
            archive.on('error', reject);
        });
        archive.pipe(outputStream);
        await appendPluginFiles(archive, directory);
        if (settingsJson != null) {
            archive.append(settingsJson, { name: 'blockmine-settings.json' });
        }
        await Promise.race([archive.finalize(), failed]);
    }

    async installFromZipBuffer(botId, buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
            throw httpError('Файл не похож на zip-архив.', 400);
        }

        let zip;
        try {
            zip = new AdmZip(buffer);
        } catch {
            throw httpError('Не удалось прочитать zip-архив.', 400);
        }

        try {
            assertArchiveLimits(zip);
        } catch (error) {
            if (!error.statusCode) error.statusCode = 400;
            throw error;
        }

        const tempDir = await fse.mkdtemp(path.join(os.tmpdir(), 'blockmine-plugin-zip-'));
        try {
            assertSafeZip(zip, tempDir);
            zip.extractAllTo(tempDir, true);
            const pluginDir = await findPluginRoot(tempDir);
            if (!pluginDir) {
                throw httpError('В архиве нет package.json плагина.', 400);
            }
            const settingsJson = await readExportedSettings(pluginDir);
            return await this.installFromLocalPath(botId, pluginDir, settingsJson);
        } catch (error) {
            if (!error.statusCode && /Небезопасный путь/.test(error.message || '')) {
                error.statusCode = 400;
            }
            throw error;
        } finally {
            await safeRemove(tempDir);
        }
    }

    async _downloadAndExtract(repoUrl, ref, destinationDir) {
        const response = await downloadGithubArchive(repoUrl, ref);
        const buffer = await response.arrayBuffer();
        const zip = new AdmZip(Buffer.from(buffer));
        const zipEntries = zip.getEntries();
        if (zipEntries.length === 0) {
            throw new Error('Скачанный архив плагина пуст.');
        }
        const rootFolderName = zipEntries[0].entryName.split('/')[0];
        await fse.mkdir(destinationDir, { recursive: true });
        assertSafeZip(zip, destinationDir);
        zip.extractAllTo(destinationDir, true);
        const extractedPath = path.join(destinationDir, rootFolderName);
        if (!await fse.pathExists(extractedPath)) {
            throw new Error('Архив плагина имеет неожиданную структуру.');
        }
        return extractedPath;
    }

    async _resolveSourceRef({ tag, repoUrl }) {
        if (tag) {
            return { sourceRefType: 'tag', sourceRef: tag, repoInfo: null };
        }
        const repoInfo = await fetchGithubRepoInfo(repoUrl);
        if (repoInfo?.default_branch) {
            return { sourceRefType: 'branch', sourceRef: repoInfo.default_branch, repoInfo };
        }
        return { sourceRefType: 'branch', sourceRef: 'main', repoInfo: null };
    }

    async _downloadToTemp(repoUrl, ref, tag, repoInfo) {
        const tempDir = await fse.mkdtemp(path.join(os.tmpdir(), 'blockmine-plugin-'));
        try {
            try {
                const extracted = await this._downloadAndExtract(repoUrl, ref, tempDir);
                return { extracted, tempDir, sourceRef: ref };
            } catch (err) {
                if (!tag && !repoInfo && ref !== 'master') {
                    console.log(`[PluginManager] Ветка '${ref}' не найдена для ${repoUrl}, пробую 'master'...`);
                    const extracted = await this._downloadAndExtract(repoUrl, 'master', tempDir);
                    return { extracted, tempDir, sourceRef: 'master' };
                }
                throw err;
            }
        } catch (err) {
            await safeRemove(tempDir);
            throw err;
        }
    }

    async installFromGithub(botId, repoUrl, prismaClient = null, isUpdate = false, tag = null) {
        const prisma = prismaClient || this.prisma;
        const normalizedRepoUrl = normalizeGithubRepoUrl(repoUrl);
        const ownerRepo = tryParseGithubRepoUrl(normalizedRepoUrl);
        if (!ownerRepo) {
            throw new Error('Invalid GitHub repository URL.');
        }

        if (!isUpdate) {
            const existing = await prisma.installedPlugin.findFirst({ where: { botId, sourceUri: normalizedRepoUrl } });
            if (existing) throw new Error(`Плагин из ${normalizedRepoUrl} уже установлен.`);
        }

        const botPluginsDir = path.join(PLUGINS_BASE_DIR, `bot_${botId}`);
        await fse.mkdir(botPluginsDir, { recursive: true });

        const { sourceRefType, sourceRef: initialRef, repoInfo } = await this._resolveSourceRef({ tag, repoUrl: normalizedRepoUrl });

        let extractedPath;
        let tempDir;
        let resolvedSourceRef = initialRef;
        try {
            const downloaded = await this._downloadToTemp(normalizedRepoUrl, initialRef, tag, repoInfo);
            extractedPath = downloaded.extracted;
            tempDir = downloaded.tempDir;
            resolvedSourceRef = downloaded.sourceRef;
        } catch (err) {
            const message = err?.message || String(err);
            if (/fetch|AbortError|timed out/i.test(message)) {
                throw new Error(`Не удалось подключиться к GitHub или репозиторий не найден. Проверьте ссылку и ваше интернет-соединение.`);
            }
            throw new Error(`Не удалось скачать архив плагина: ${message}`);
        }

        const localPath = path.join(botPluginsDir, ownerRepo.repo);
        let registeredPluginId = null;

        try {
            const packageJsonPath = path.join(extractedPath, 'package.json');
            if (!await fse.pathExists(packageJsonPath)) {
                throw new Error('В архиве плагина отсутствует package.json.');
            }
            const packageJson = JSON.parse(await fse.readFile(packageJsonPath, 'utf-8'));
            if (!packageJson.name || !packageJson.version) {
                throw new Error('package.json не содержит обязательных полей name и version.');
            }

            await this._logDependencyWarnings(botId, packageJson);

            if (await fse.pathExists(localPath)) {
                await fse.remove(localPath);
            }
            await fse.move(extractedPath, localPath, { overwrite: true });

            await this._installDependencies(localPath);

            const newPlugin = await this.registerPlugin(botId, localPath, 'GITHUB', normalizedRepoUrl, prisma, {
                sourceRefType,
                sourceRef: resolvedSourceRef,
            });
            registeredPluginId = newPlugin.id;

            reportPluginDownload(packageJson.name);

            await this.loadPluginGraphs(botId, newPlugin.id, localPath);

            if (this.botManager) {
                await this.botManager.reloadPlugins(botId);
            }

            return newPlugin;
        } catch (error) {
            if (!isUpdate && registeredPluginId !== null) {
                await prisma.installedPlugin
                    .delete({ where: { id: registeredPluginId } })
                    .catch(() => {});
            }
            await safeRemove(localPath);
            throw error;
        } finally {
            await safeRemove(tempDir);
        }
    }

    async registerPlugin(botId, directoryPath, sourceType, sourceUri, prismaClient = null, extraData = {}) {
        const prisma = prismaClient || this.prisma;
        const packageJsonPath = path.join(directoryPath, 'package.json');
        let packageJson;
        try {
            packageJson = JSON.parse(await fse.readFile(packageJsonPath, 'utf-8'));
        } catch (e) {
            throw new Error(`Не удалось прочитать или распарсить package.json в плагине по пути: ${directoryPath}`);
        }

        if (!packageJson.name || !packageJson.version) {
            throw new Error('package.json не содержит обязательных полей name и version');
        }

        const pluginData = {
            botId,
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description || '',
            path: directoryPath,
            sourceType,
            sourceUri: sourceUri || directoryPath,
            manifest: JSON.stringify(packageJson.botpanel || {}),
            ...extraData,
        };

        const saved = await prisma.installedPlugin.upsert({
            where: { botId_name: { botId, name: packageJson.name } },
            update: pluginData,
            create: pluginData,
        });
        await ensureDeclaredPermissions(prisma, botId, packageJson.name, packageJson.botpanel || {});
        return saved;
    }

    _clearPluginRequireCache(pluginPath) {
        if (!pluginPath) return;
        const normalized = path.resolve(pluginPath);
        const prefix = normalized + path.sep;
        for (const key of Object.keys(require.cache)) {
            if (key === normalized || key.startsWith(prefix)) {
                delete require.cache[key];
            }
        }
    }

    async reviewManifest(botId, packageJson, previousManifest = null) {
        const manifest = packageJson?.botpanel || {};
        const dependencies = await this.checkPluginDependencies(botId, packageJson);
        const declared = listDeclaredPermissions(manifest);
        const existing = await this.prisma.permission.findMany({
            where: { botId: Number(botId) },
            select: { name: true },
        });
        const existingNames = new Set(existing.map((item) => item.name));
        const permissions = declared.map((item) => ({
            ...item,
            exists: existingNames.has(item.name),
        }));
        const settings = diffSettings(previousManifest?.settings || {}, manifest.settings || {});
        return { dependencies, permissions, settings };
    }

    async _unloadInBotProcess(botId, pluginName) {
        const processManager = this.botManager?.processManager;
        if (!processManager?.isRunning?.(botId)) return;
        const { v4: uuidv4 } = require('uuid');
        const requestId = uuidv4();
        const pending = processManager.waitForPluginUnload(requestId);
        const sent = processManager.sendMessage(botId, {
            type: 'plugins:unload',
            pluginName,
            requestId,
        });
        if (!sent) return;
        await pending;
    }

    async deletePlugin(pluginId) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) throw new Error('Плагин не найден');

        const pluginOwnerId = `plugin:${plugin.name}`;
        console.log(`[PluginManager] Удаление плагина ${plugin.name} (ID: ${plugin.id})`);

        try {
            await this._unloadInBotProcess(plugin.botId, plugin.name);
        } catch (error) {
            console.error(`[PluginManager] Ошибка onUnload в процессе бота для ${plugin.name}:`, error);
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                await tx.command.deleteMany({ where: { botId: plugin.botId, pluginOwnerId: plugin.id } });
                await tx.eventGraph.deleteMany({ where: { botId: plugin.botId, pluginOwnerId: plugin.id } });
                await tx.permission.deleteMany({ where: { botId: plugin.botId, owner: pluginOwnerId } });
                await tx.group.deleteMany({ where: { botId: plugin.botId, owner: pluginOwnerId } });
                await tx.installedPlugin.delete({ where: { id: pluginId } });
            });
        } catch (dbError) {
            console.error(`[PluginManager] Ошибка при очистке БД для плагина ${plugin.name}:`, dbError);
            throw new Error('Ошибка при удалении данных плагина из БД. Файлы не были удалены.');
        }

        if (plugin.path && plugin.path.startsWith(PLUGINS_BASE_DIR)) {
            await safeRemove(plugin.path);
        }
    }

    async _resolveLatestTagWithCache(repoUrl) {
        if (!repoUrl) return null;
        const cached = this.latestTagCache.get(repoUrl);
        if (cached !== null) return cached.value;
        const fetched = await fetchLatestGithubVersionTag(repoUrl);
        this.latestTagCache.set(repoUrl, { value: fetched });
        return fetched;
    }

    async _resolveLatestVersionWithCache(repoUrl, ref) {
        if (!repoUrl) return null;
        const cacheKey = `${repoUrl}::${ref || 'default'}`;
        const cached = this.latestVersionCache.get(cacheKey);
        if (cached !== null) return cached.value;
        const fetched = await fetchGithubPackageVersion(repoUrl, ref);
        this.latestVersionCache.set(cacheKey, { value: fetched });
        return fetched;
    }

    async checkForUpdates(botId, catalog) {
        const githubPlugins = await this.prisma.installedPlugin.findMany({
            where: { botId, sourceType: 'GITHUB' },
        });
        const updatesAvailable = [];
        const catalogMapByRepo = new Map();
        const catalogMapByName = new Map();
        const catalogMapByRepoName = new Map();

        for (const item of catalog) {
            const normalizedRepoUrl = tryNormalizeGithubRepoUrl(item.repoUrl);
            if (normalizedRepoUrl) {
                catalogMapByRepo.set(normalizedRepoUrl, item);
                const repoName = getGithubRepoName(normalizedRepoUrl);
                if (repoName && !catalogMapByRepoName.has(repoName)) {
                    catalogMapByRepoName.set(repoName, item);
                }
            }
            if (item?.name) {
                catalogMapByName.set(String(item.name).toLowerCase(), item);
            }
        }

        for (const plugin of githubPlugins) {
            try {
                const normalizedSourceUri = tryNormalizeGithubRepoUrl(plugin.sourceUri);
                const repoName = getGithubRepoName(normalizedSourceUri || plugin.sourceUri);
                const catalogInfo =
                    (normalizedSourceUri ? catalogMapByRepo.get(normalizedSourceUri) : null) ||
                    catalogMapByName.get(String(plugin.name).toLowerCase()) ||
                    (repoName ? catalogMapByRepoName.get(repoName) : null);

                const targetRepoUrl = catalogInfo?.repoUrl || normalizedSourceUri || tryNormalizeGithubRepoUrl(plugin.sourceUri) || plugin.sourceUri;
                let latestTagRaw =
                    catalogInfo?.latestTag ||
                    catalogInfo?.recommendedVersion ||
                    catalogInfo?.version ||
                    catalogInfo?.latestVersion ||
                    catalogInfo?.tag;

                if (!latestTagRaw) {
                    latestTagRaw = await this._resolveLatestTagWithCache(targetRepoUrl);
                }

                let latestVersionRaw = latestTagRaw;
                if (!latestVersionRaw && targetRepoUrl) {
                    latestVersionRaw = await this._resolveLatestVersionWithCache(
                        targetRepoUrl,
                        plugin.sourceRefType === 'branch' ? plugin.sourceRef : null
                    );
                }

                if (!latestVersionRaw) continue;

                const localSemver = semver.coerce(plugin.version);
                const remoteSemver = semver.coerce(latestVersionRaw);
                if (!localSemver || !remoteSemver) continue;

                if (semver.gt(remoteSemver.version, localSemver.version)) {
                    updatesAvailable.push({
                        id: plugin.id,
                        name: plugin.name,
                        sourceUri: plugin.sourceUri,
                        currentVersion: localSemver.version,
                        recommendedVersion: remoteSemver.version,
                        latestTag: catalogInfo?.latestTag || latestTagRaw || null,
                        targetRepoUrl,
                    });
                }
            } catch (error) {
                console.error(`[PluginManager] Ошибка проверки обновлений для ${plugin.name}:`, error.message);
            }
        }
        return updatesAvailable;
    }

    async updatePlugin(pluginId, targetTag = null, targetRepoUrl = null) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin || plugin.sourceType !== 'GITHUB') {
            throw new Error('Плагин не найден или не является GitHub-плагином.');
        }

        const repoUrl = targetRepoUrl || plugin.sourceUri;
        const botId = plugin.botId;
        const oldVersion = plugin.version;
        const oldPath = plugin.path;

        const backupData = {
            name: plugin.name,
            settings: plugin.settings,
            isEnabled: plugin.isEnabled,
        };

        let backupPath = null;
        if (oldPath && await fse.pathExists(oldPath)) {
            backupPath = `${oldPath}.bak-${Date.now()}`;
            try {
                await fse.move(oldPath, backupPath, { overwrite: true });
            } catch (moveError) {
                console.warn(`[PluginManager] Не удалось создать резервную копию ${oldPath}: ${moveError.message}`);
                backupPath = null;
            }
        }

        try {
            await this.deletePlugin(pluginId);
        } catch (deleteError) {
            if (backupPath) {
                await fse.move(backupPath, oldPath, { overwrite: true }).catch(() => {});
            }
            throw deleteError;
        }

        let newPlugin;
        try {
            newPlugin = await this.installFromGithub(botId, repoUrl, this.prisma, true, targetTag);
        } catch (installError) {
            if (backupPath) {
                try {
                    await fse.move(backupPath, oldPath, { overwrite: true });
                    const restored = await this.registerPlugin(botId, oldPath, 'GITHUB', repoUrl, this.prisma, {
                        sourceRefType: plugin.sourceRefType,
                        sourceRef: plugin.sourceRef,
                    });
                    await this.prisma.installedPlugin.update({
                        where: { id: restored.id },
                        data: {
                            settings: backupData.settings,
                            isEnabled: backupData.isEnabled,
                        },
                    });
                    await this.loadPluginGraphs(botId, restored.id, oldPath);
                    if (this.botManager) {
                        await this.botManager.reloadPlugins(botId);
                    }
                    console.warn(`[PluginManager] Обновление ${plugin.name} провалилось, восстановлена прежняя версия ${oldVersion}.`);
                } catch (restoreError) {
                    console.error(`[PluginManager] Не удалось восстановить плагин ${plugin.name} после неудачного обновления:`, restoreError);
                }
            }
            throw installError;
        }

        if (backupPath) {
            await safeRemove(backupPath);
        }

        const oldMajor = semver.major(semver.coerce(oldVersion) || '0.0.0');
        const newMajor = semver.major(semver.coerce(newPlugin.version) || '0.0.0');
        const isMajorUpdate = newMajor > oldMajor;

        if (isMajorUpdate) {
            await this.prisma.installedPlugin.update({
                where: { id: newPlugin.id },
                data: { isEnabled: backupData.isEnabled },
            });
        } else if (backupData.settings) {
            try {
                await this.prisma.installedPlugin.update({
                    where: { id: newPlugin.id },
                    data: {
                        settings: backupData.settings,
                        isEnabled: backupData.isEnabled,
                    },
                });
            } catch (settingsError) {
                console.error(`[PluginManager] Не удалось восстановить настройки для ${plugin.name}:`, settingsError);
            }
        }

        try {
            const pluginHooks = new PluginHooks({ prisma: this.prisma });
            await pluginHooks.callOnUpdate(newPlugin.id, oldVersion, newPlugin.version);
        } catch (hookError) {
            console.error(`[PluginManager] Ошибка выполнения хука onUpdate для ${plugin.name}:`, hookError);
        }

        return newPlugin;
    }

    async loadPluginGraphs(botId, pluginId, pluginPath) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {
            console.error(`[PluginManager] Плагин с ID ${pluginId} не найден`);
            return;
        }

        try {
            const graphDir = path.join(pluginPath, 'graph');
            if (!await fse.pathExists(graphDir)) {
                return;
            }

            const graphFiles = await fse.readdir(graphDir);
            const jsonFiles = graphFiles.filter((file) => file.endsWith('.json'));

            for (const fileName of jsonFiles) {
                try {
                    const graphName = path.basename(fileName, '.json');
                    const graphPath = path.join(graphDir, fileName);
                    const graphData = await fse.readJson(graphPath);

                    const hasCommandNode = graphData.nodes?.some((node) => node.type === 'event:command');
                    const hasEventNode = graphData.nodes?.some((node) => node.type?.startsWith('event:') && node.type !== 'event:command');

                    if (hasCommandNode) {
                        const existing = await this.prisma.command.findFirst({
                            where: { botId, name: graphName, pluginOwnerId: pluginId },
                        });
                        if (existing) continue;

                        await this.prisma.command.create({
                            data: {
                                botId,
                                name: graphName,
                                description: graphData.command || `Команда ${graphName}`,
                                graphJson: JSON.stringify(graphData),
                                isEnabled: true,
                                pluginOwnerId: pluginId,
                                owner: `plugin:${plugin.name}`,
                                isVisual: true,
                            },
                        });
                    } else if (hasEventNode) {
                        const existing = await this.prisma.eventGraph.findFirst({
                            where: { botId, name: graphName, pluginOwnerId: pluginId },
                        });
                        if (existing) continue;

                        await this.prisma.eventGraph.create({
                            data: {
                                botId,
                                name: graphName,
                                graphJson: JSON.stringify(graphData),
                                isEnabled: true,
                                pluginOwnerId: pluginId,
                            },
                        });
                    } else {
                        console.warn(`[PluginManager] Неизвестный тип графа в файле ${fileName}, пропускаем`);
                    }
                } catch (error) {
                    console.error(`[PluginManager] Ошибка загрузки графа ${fileName}:`, error);
                }
            }
        } catch (error) {
            console.error(`[PluginManager] Ошибка загрузки графов плагина:`, error);
        }
    }

    async clearPluginData(pluginId) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {
            throw new Error('Плагин не найден.');
        }

        const { count } = await this.prisma.pluginDataStore.deleteMany({
            where: { pluginName: plugin.name, botId: plugin.botId },
        });

        return { count };
    }

    async reloadLocalPlugin(pluginId) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) throw new Error('Плагин не найден.');

        if (plugin.sourceType !== 'LOCAL' && plugin.sourceType !== 'LOCAL_IDE') {
            throw new Error('Перезагрузка доступна только для локальных плагинов.');
        }

        const pluginPath = plugin.path;
        const packageJsonPath = path.join(pluginPath, 'package.json');
        if (!await fse.pathExists(packageJsonPath)) {
            throw new Error(`package.json не найден: ${packageJsonPath}`);
        }

        let packageJson;
        try {
            packageJson = JSON.parse(await fse.readFile(packageJsonPath, 'utf-8'));
        } catch (e) {
            throw new Error(`Не удалось прочитать package.json: ${e.message}`);
        }

        const manifest = packageJson.botpanel || {};
        const stampPath = path.join(pluginPath, '.bm-installed-deps.json');
        const nextStamp = JSON.stringify(packageJson.dependencies || {});
        let previousStamp = '';
        if (await fse.pathExists(stampPath)) {
            previousStamp = await fse.readFile(stampPath, 'utf8');
        }
        const nodeModulesPath = path.join(pluginPath, 'node_modules');
        if (nextStamp !== previousStamp || (nextStamp !== '{}' && !await fse.pathExists(nodeModulesPath))) {
            await this._installDependencies(pluginPath);
            await fse.writeFile(stampPath, nextStamp);
        }

        const updatedPlugin = await this.prisma.installedPlugin.update({
            where: { id: pluginId },
            data: {
                version: packageJson.version,
                description: packageJson.description || '',
                manifest: JSON.stringify(manifest),
            },
        });

        if (this.botManager) {
            await this.botManager.reloadPlugins(plugin.botId, plugin.name);
        }

        return updatedPlugin;
    }
}

module.exports = PluginManager;
