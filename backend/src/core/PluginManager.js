const path = require('path');
const fse = require('fs-extra');
const os = require('os');
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const AdmZip = require('adm-zip');
const semver = require('semver');

const prisma = new PrismaClient();

const DATA_DIR = path.join(os.homedir(), '.blockmine');
const PLUGINS_BASE_DIR = path.join(DATA_DIR, 'storage', 'plugins');

const TELEMETRY_ENABLED = true;
const STATS_SERVER_URL = 'http://185.65.200.184:3000';

function reportPluginDownload(pluginName) {
    if (!TELEMETRY_ENABLED) return;

    console.log(`[Telemetry] Попытка отправить статистику по плагину: ${pluginName}`);

    fetch(`${STATS_SERVER_URL}/api/plugins/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plugin_name: pluginName })
    })
    .then(res => {
        if (res.ok) {
            console.log(`[Telemetry] Статистика для плагина ${pluginName} успешно отправлена.`);
        } else {
            console.error(`[Telemetry] Сервер статистики вернул ошибку для плагина ${pluginName}: ${res.statusText}`);
        }
    })
    .catch(error => {
        console.error(`[Telemetry] Не удалось отправить статистику по плагину ${pluginName}: ${error.message}`);
    });
}


class PluginManager {
    constructor(botManager) {
        this.botManager = botManager;
        this.ensureBaseDirExists();
    }

    async ensureBaseDirExists() {
        await fse.mkdir(PLUGINS_BASE_DIR, { recursive: true }).catch(console.error);
    }

    async _installDependencies(pluginPath) {
        const packageJsonPath = path.join(pluginPath, 'package.json');
        try {
            if (await fse.pathExists(packageJsonPath)) {
                const packageJson = await fse.readJson(packageJsonPath);
                if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
                    console.log(`[PluginManager] Установка зависимостей для плагина в ${pluginPath}...`);
                    // Используем --omit=dev чтобы не ставить dev-зависимости
                    execSync('npm install --omit=dev', {
                        cwd: pluginPath,
                        stdio: 'inherit'
                    });
                    console.log(`[PluginManager] Зависимости успешно установлены.`);
                }
            }
        } catch (error) {
            console.error(`[PluginManager] Ошибка при установке зависимостей в ${pluginPath}:`, error);
            throw new Error('Не удалось установить зависимости плагина.');
        }
    }

    async installFromLocalPath(botId, directoryPath) {
        const newPlugin = await this.registerPlugin(botId, directoryPath, 'LOCAL', directoryPath);
        try {
            const packageJson = JSON.parse(await fse.readFile(path.join(directoryPath, 'package.json'), 'utf-8'));
            reportPluginDownload(packageJson.name);
        } catch(e) {
            console.error('Не удалось прочитать package.json для отправки статистики локального плагина');
        }

        await this._installDependencies(directoryPath);
        await this.loadPluginGraphs(botId, newPlugin.id, directoryPath);
        
        if (this.botManager) {
            await this.botManager.reloadPlugins(botId);
        }
        
        return newPlugin;
    }

    async installFromGithub(botId, repoUrl, prismaClient = prisma, isUpdate = false) {
        const botPluginsDir = path.join(PLUGINS_BASE_DIR, `bot_${botId}`);
        await fse.mkdir(botPluginsDir, { recursive: true });

        if (!isUpdate) {
        const existing = await prismaClient.installedPlugin.findFirst({ where: { botId, sourceUri: repoUrl } });
        if (existing) throw new Error(`Плагин из ${repoUrl} уже установлен.`);
        }

        try {
            const url = new URL(repoUrl);
            const repoPath = url.pathname.replace(/^\/|\.git$/g, '');
            const archiveUrlMain = `https://github.com/${repoPath}/archive/refs/heads/main.zip`;
            const archiveUrlMaster = `https://github.com/${repoPath}/archive/refs/heads/master.zip`;

            let response = await fetch(archiveUrlMain);
            if (!response.ok) {
                console.log(`[PluginManager] Ветка 'main' не найдена для ${repoUrl}, пробую 'master'...`);
                response = await fetch(archiveUrlMaster);
                if (!response.ok) {
                    throw new Error(`Не удалось скачать архив плагина. Статус: ${response.status}`);
                }
            }
            const buffer = await response.arrayBuffer();

            const zip = new AdmZip(Buffer.from(buffer));
            const zipEntries = zip.getEntries();
            if (zipEntries.length === 0) {
                throw new Error('Скачанный архив плагина пуст.');
            }
            const rootFolderName = zipEntries[0].entryName.split('/')[0];
            const repoName = path.basename(repoPath);
            const localPath = path.join(botPluginsDir, repoName);
            
            if (await fse.pathExists(localPath)) {
                await fse.remove(localPath);
            }
            const tempExtractPath = path.join(botPluginsDir, rootFolderName);
            if (await fse.pathExists(tempExtractPath)) {
                await fse.remove(tempExtractPath);
            }
            
            zip.extractAllTo(botPluginsDir, true);
            
            await fse.move(tempExtractPath, localPath, { overwrite: true });

            await this._installDependencies(localPath);

            const newPlugin = await this.registerPlugin(botId, localPath, 'GITHUB', repoUrl, prismaClient);
            
            const packageJson = JSON.parse(await fse.readFile(path.join(localPath, 'package.json'), 'utf-8'));
            reportPluginDownload(packageJson.name);

            await this.loadPluginGraphs(botId, newPlugin.id, localPath);

            if (this.botManager) {
                await this.botManager.reloadPlugins(botId);
            }
            
            return newPlugin;

        } catch (error) {
            console.error(`[PluginManager] Ошибка установки с GitHub: ${error.message}`);
            if (error.message.includes('fetch')) {
                 throw new Error(`Не удалось подключиться к GitHub или репозиторий не найден. Проверьте ссылку и ваше интернет-соединение.`);
            }
            throw error;
        }
    }

    async registerPlugin(botId, directoryPath, sourceType, sourceUri, prismaClient = prisma) {
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
        };
        
        return prismaClient.installedPlugin.upsert({
            where: { botId_name: { botId, name: packageJson.name } },
            update: pluginData,
            create: pluginData,
        });
    }

    async deletePlugin(pluginId) {
        const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) throw new Error('Плагин не найден');

        const pluginOwnerId = `plugin:${plugin.name}`;
        console.log(`[PluginManager] Начало удаления плагина ${plugin.name} (ID: ${plugin.id}) и его ресурсов.`);
        console.log(`[PluginManager] Идентификатор владельца для очистки: ${pluginOwnerId}`);

        try {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            const mainFile = manifest.main || 'index.js';
            const entryPointPath = path.join(plugin.path, mainFile);
            
            if (await fse.pathExists(entryPointPath)) {
                if (require.cache[require.resolve(entryPointPath)]) {
                    delete require.cache[require.resolve(entryPointPath)];
                }
                
                const pluginModule = require(entryPointPath);

                if (pluginModule && typeof pluginModule.onUnload === 'function') {
                    console.log(`[PluginManager] Вызов хука onUnload для плагина ${plugin.name}...`);
                    await pluginModule.onUnload({ botId: plugin.botId, prisma });
                    console.log(`[PluginManager] Хук onUnload для ${plugin.name} успешно выполнен.`);
                }
            } else {
                 console.warn(`[PluginManager] Главный файл плагина ${entryPointPath} не найден. Хук onUnload пропущен.`);
            }
        } catch (error) {
            console.error(`[PluginManager] Ошибка при выполнении хука onUnload для плагина ${plugin.name}:`, error);
        }

        try {
            await prisma.$transaction(async (tx) => {
                const deletedCommands = await tx.command.deleteMany({
                    where: { botId: plugin.botId, pluginOwnerId: plugin.id },
                });
                if (deletedCommands.count > 0) console.log(`[DB Cleanup] Удалено команд: ${deletedCommands.count}`);

                const deletedEventGraphs = await tx.eventGraph.deleteMany({
                    where: { botId: plugin.botId, pluginOwnerId: plugin.id },
                });
                if (deletedEventGraphs.count > 0) console.log(`[DB Cleanup] Удалено графов событий: ${deletedEventGraphs.count}`);

                const deletedPermissions = await tx.permission.deleteMany({
                    where: { botId: plugin.botId, owner: pluginOwnerId },
                });
                 if (deletedPermissions.count > 0) console.log(`[DB Cleanup] Удалено прав: ${deletedPermissions.count}`);

                const deletedGroups = await tx.group.deleteMany({
                    where: { botId: plugin.botId, owner: pluginOwnerId },
                });
                if (deletedGroups.count > 0) console.log(`[DB Cleanup] Удалено групп: ${deletedGroups.count}`);

                await tx.installedPlugin.delete({ where: { id: pluginId } });
                console.log(`[DB Cleanup] Запись о плагине ${plugin.name} удалена.`);
            });
        } catch (dbError) {
             console.error(`[PluginManager] Ошибка при очистке БД для плагина ${plugin.name}:`, dbError);
             throw new Error('Ошибка при удалении данных плагина из БД. Файлы не были удалены.');
        }

        if (plugin.path && plugin.path.startsWith(PLUGINS_BASE_DIR)) {
            try {
                if (await fse.pathExists(plugin.path)) {
                    await fse.remove(plugin.path);
                    console.log(`[PluginManager] Папка плагина ${plugin.path} успешно удалена.`);
                } else {
                    console.log(`[PluginManager] Папка плагина ${plugin.path} не найдена, удаление не требуется.`);
                }
            } catch (fileError) {
                console.error(`Не удалось удалить папку плагина ${plugin.path}:`, fileError);
            }
        }
    }

    async checkForUpdates(botId, catalog) {
        const githubPlugins = await prisma.installedPlugin.findMany({
            where: { botId, sourceType: 'GITHUB' }
        });
        const updatesAvailable = [];
        const catalogMap = new Map(catalog.map(item => [item.repoUrl, item]));

        for (const plugin of githubPlugins) {
            try {
                const catalogInfo = catalogMap.get(plugin.sourceUri);
                if (!catalogInfo || !catalogInfo.latestTag) continue;
                
                const localVersion = semver.coerce(plugin.version)?.version || plugin.version;
                const recommendedVersion = semver.coerce(catalogInfo.latestTag)?.version || catalogInfo.latestTag;

                if (semver.gt(recommendedVersion, localVersion)) {
                    updatesAvailable.push({
                        id: plugin.id,
                        name: plugin.name,
                        sourceUri: plugin.sourceUri,
                        currentVersion: localVersion,
                        recommendedVersion: recommendedVersion,
                    });
                }
            } catch (error) {
                console.error(`[PluginManager] Ошибка проверки обновлений для ${plugin.name}:`, error.message);
            }
        }
        return updatesAvailable;
    }

    async updatePlugin(pluginId) {
        const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin || plugin.sourceType !== 'GITHUB') {
            throw new Error('Плагин не найден или не является GitHub-плагином.');
        }

        console.log(`[PluginManager] Начало обновления плагина ${plugin.name}...`);
        
        const repoUrl = plugin.sourceUri;
        const botId = plugin.botId;
        
        await this.deletePlugin(pluginId);
        console.log(`[PluginManager] Старая версия ${plugin.name} удалена, устанавливаем новую...`);
        
        return await this.installFromGithub(botId, repoUrl, prisma, true);
    }

    async loadPluginGraphs(botId, pluginId, pluginPath) {
        const plugin = await prisma.installedPlugin.findUnique({
            where: { id: pluginId }
        });
        
        if (!plugin) {
            console.error(`[PluginManager] Плагин с ID ${pluginId} не найден`);
            return;
        }
        try {
            const graphDir = path.join(pluginPath, 'graph');
            if (!await fse.pathExists(graphDir)) {
                console.log(`[PluginManager] Папка graph не найдена в плагине: ${graphDir}`);
                return;
            }

            const graphFiles = await fse.readdir(graphDir);
            const jsonFiles = graphFiles.filter(file => file.endsWith('.json'));

            console.log(`[PluginManager] Найдено ${jsonFiles.length} файлов графов в плагине`);

            for (const fileName of jsonFiles) {
                try {
                    const graphName = path.basename(fileName, '.json');
                    const graphPath = path.join(graphDir, fileName);
                    const graphData = await fse.readJson(graphPath);


                    
                    const hasCommandNode = graphData.nodes?.some(node => node.type === 'event:command');
                    const hasEventNode = graphData.nodes?.some(node => node.type?.startsWith('event:') && node.type !== 'event:command');
                    
                    const isCommand = hasCommandNode;
                    const isEventGraph = hasEventNode;

                    if (isEventGraph) {
                        const existingEventGraph = await prisma.eventGraph.findFirst({
                            where: { botId, name: graphName }
                        });

                        if (existingEventGraph) {
                            console.log(`[PluginManager] Граф события ${graphName} уже существует, пропускаем`);
                            continue;
                        }

                        const newEventGraph = await prisma.eventGraph.create({
                            data: {
                                botId,
                                name: graphName,
                                graphJson: JSON.stringify(graphData),
                                isEnabled: true,
                                pluginOwnerId: pluginId
                            }
                        });

                        console.log(`[PluginManager] Загружен граф события: ${graphName} (ID: ${newEventGraph.id})`);
                    } else if (isCommand) {
                        const existingCommand = await prisma.command.findFirst({
                            where: { botId, name: graphName }
                        });

                        if (existingCommand) {
                            console.log(`[PluginManager] Команда ${graphName} уже существует, пропускаем`);
                            continue;
                        }

                        const newCommand = await prisma.command.create({
                            data: {
                                botId,
                                name: graphName,
                                description: graphData.command || `Команда ${graphName}`,
                                graphJson: JSON.stringify(graphData),
                                isEnabled: true,
                                pluginOwnerId: pluginId,
                                owner: `plugin:${plugin.name}`,
                                isVisual: true
                            }
                        });

                        console.log(`[PluginManager] Загружена команда: ${graphName} (ID: ${newCommand.id}) с pluginOwnerId: ${pluginId}`);
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
        const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {
            throw new Error('Плагин не найден.');
        }

        console.log(`[PluginManager] Очистка данных для плагина ${plugin.name} (Bot ID: ${plugin.botId})`);

        const { count } = await prisma.pluginDataStore.deleteMany({
            where: {
                pluginName: plugin.name,
                botId: plugin.botId,
            },
        });

        console.log(`[PluginManager] Удалено ${count} записей из хранилища.`);
        return { count };
    }
}

module.exports = PluginManager;