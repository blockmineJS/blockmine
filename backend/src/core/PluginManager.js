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
const TtlCache = require('./utils/ttlCache');

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const PLUGINS_BASE_DIR = path.join(DATA_DIR, 'storage', 'plugins');

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
            if ((depVersion.startsWith('^') || depVersion.startsWith('~'))) {
                const requiredBase = depVersion.slice(1);
                if (!installedVersion.startsWith(requiredBase.split('.')[0])) {
                    result.warnings.push(`${depName}: установлена v${installedVersion}, требуется ${depVersion}`);
                }
            }
        }

        return result;
    }

    async _installDependencies(pluginPath) {
        try {
            await installDependencies(pluginPath, { sendLog: (msg) => console.log(`[PluginManager] ${msg}`) });
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

    async installFromLocalPath(botId, directoryPath) {
        const packageJsonPath = path.join(directoryPath, 'package.json');
        const packageJson = JSON.parse(await fse.readFile(packageJsonPath, 'utf-8'));

        await this._logDependencyWarnings(botId, packageJson);

        const newPlugin = await this.registerPlugin(botId, directoryPath, 'LOCAL', directoryPath);

        try {
            reportPluginDownload(packageJson.name);
        } catch (e) {
            console.error('Не удалось отправить статистику по локальному плагину', e?.message);
        }

        await this._installDependencies(directoryPath);
        await this.loadPluginGraphs(botId, newPlugin.id, directoryPath);

        if (this.botManager) {
            await this.botManager.reloadPlugins(botId);
        }

        return newPlugin;
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

            reportPluginDownload(packageJson.name);

            await this.loadPluginGraphs(botId, newPlugin.id, localPath);

            if (this.botManager) {
                await this.botManager.reloadPlugins(botId);
            }

            return newPlugin;
        } catch (error) {
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

        return prisma.installedPlugin.upsert({
            where: { botId_name: { botId, name: packageJson.name } },
            update: pluginData,
            create: pluginData,
        });
    }

    _clearPluginRequireCache(pluginPath) {
        if (!pluginPath) return;
        const normalized = path.resolve(pluginPath);
        for (const key of Object.keys(require.cache)) {
            if (key.startsWith(normalized)) {
                delete require.cache[key];
            }
        }
    }

    async deletePlugin(pluginId) {
        const plugin = await this.prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) throw new Error('Плагин не найден');

        const pluginOwnerId = `plugin:${plugin.name}`;
        console.log(`[PluginManager] Удаление плагина ${plugin.name} (ID: ${plugin.id})`);

        try {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            const mainFile = manifest.main || 'index.js';
            const entryPointPath = path.join(plugin.path, mainFile);
            if (await fse.pathExists(entryPointPath)) {
                this._clearPluginRequireCache(plugin.path);
                const pluginModule = require(entryPointPath);
                if (pluginModule && typeof pluginModule.onUnload === 'function') {
                    await pluginModule.onUnload({ botId: plugin.botId, prisma: this.prisma });
                }
                this._clearPluginRequireCache(plugin.path);
            }
        } catch (error) {
            console.error(`[PluginManager] Ошибка при выполнении хука onUnload для плагина ${plugin.name}:`, error);
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
        if (cached !== null) return cached;
        const fetched = await fetchLatestGithubVersionTag(repoUrl);
        this.latestTagCache.set(repoUrl, fetched);
        return fetched;
    }

    async _resolveLatestVersionWithCache(repoUrl, ref) {
        if (!repoUrl) return null;
        const cacheKey = `${repoUrl}::${ref || 'default'}`;
        const cached = this.latestVersionCache.get(cacheKey);
        if (cached !== null) return cached;
        const fetched = await fetchGithubPackageVersion(repoUrl, ref);
        this.latestVersionCache.set(cacheKey, fetched);
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

                    if (hasEventNode) {
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
                    } else if (hasCommandNode) {
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
        const defaultSettings = {};

        if (manifest.settings) {
            for (const [key, config] of Object.entries(manifest.settings)) {
                if (config?.default !== undefined) {
                    try {
                        defaultSettings[key] = JSON.parse(config.default);
                    } catch {
                        defaultSettings[key] = config.default;
                    }
                }
            }
        }

        const updatedPlugin = await this.prisma.installedPlugin.update({
            where: { id: pluginId },
            data: {
                version: packageJson.version,
                description: packageJson.description || '',
                manifest: JSON.stringify(manifest),
                settings: JSON.stringify(defaultSettings),
            },
        });

        if (this.botManager) {
            await this.botManager.reloadPlugins(plugin.botId);
        }

        return updatedPlugin;
    }
}

module.exports = PluginManager;
