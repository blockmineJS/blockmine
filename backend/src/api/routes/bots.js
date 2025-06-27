const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs/promises');
const BotManager = require('../../core/BotManager');
const PluginManager = require('../../core/PluginManager');
const UserService = require('../../core/UserService');
const commandManager = require('../../core/system/CommandManager');
const { authenticate, authorize } = require('../middleware/auth');
const { encrypt } = require('../../core/utils/crypto');

const multer = require('multer');
const archiver = require('archiver');
const AdmZip = require('adm-zip');

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });


const router = express.Router();


router.use(authenticate);

async function setupDefaultPermissionsForBot(botId, prismaClient = prisma) {
    const initialData = {
        groups: ["User", "Admin"],
        permissions: [
          { name: "admin.*", description: "Все права администратора" },
          { name: "admin.cooldown.bypass", description: "Обход кулдауна для админ-команд" },
          { name: "user.*", description: "Все права обычного пользователя" },
          { name: "user.say", description: "Доступ к простым командам" },
          { name: "user.cooldown.bypass", description: "Обход кулдауна для юзер-команд" },
        ],
        groupPermissions: {
          "User": ["user.say"],
          "Admin": ["admin.*", "admin.cooldown.bypass", "user.cooldown.bypass", "user.*"]
        },
    };
    
    for (const perm of initialData.permissions) {
        await prismaClient.permission.upsert({ where: { botId_name: { botId, name: perm.name } }, update: { description: perm.description }, create: { ...perm, botId, owner: 'system' } });
    }
    for (const groupName of initialData.groups) {
        await prismaClient.group.upsert({ where: { botId_name: { botId, name: groupName } }, update: {}, create: { name: groupName, botId, owner: 'system' } });
    }
    for (const [groupName, permNames] of Object.entries(initialData.groupPermissions)) {
        const group = await prismaClient.group.findUnique({ where: { botId_name: { botId, name: groupName } } });
        if (group) {
            for (const permName of permNames) {
                const permission = await prismaClient.permission.findUnique({ where: { botId_name: { botId, name: permName } } });
                if (permission) {
                    await prismaClient.groupPermission.upsert({ where: { groupId_permissionId: { groupId: group.id, permissionId: permission.id } }, update: {}, create: { groupId: group.id, permissionId: permission.id } });
                }
            }
        }
    }
    console.log(`[Setup] Для бота ID ${botId} созданы группы и права по умолчанию.`);
}


router.get('/', authorize('bot:list'), async (req, res) => {
    try {
        const bots = await prisma.bot.findMany({ include: { server: true }, orderBy: { createdAt: 'asc' } });
        res.json(bots);
    } catch (error) { 
        console.error("[API /api/bots] Ошибка получения списка ботов:", error);
        res.status(500).json({ error: 'Не удалось получить список ботов' }); 
    }
});

router.get('/state', authorize('bot:list'), (req, res) => {
    try {
        const state = BotManager.getFullState();
        res.json(state);
    } catch (error) { res.status(500).json({ error: 'Не удалось получить состояние ботов' }); }
});

router.post('/', authorize('bot:create'), async (req, res) => {
    try {
        const { username, password, prefix, serverId, note } = req.body;
        if (!username || !serverId) return res.status(400).json({ error: 'Имя и сервер обязательны' });
        
        const data = { 
            username, 
            prefix, 
            note, 
            serverId: parseInt(serverId, 10),
            password: password ? encrypt(password) : null 
        };

        const newBot = await prisma.bot.create({
            data: data,
            include: { server: true }
        });
        await setupDefaultPermissionsForBot(newBot.id);
        res.status(201).json(newBot);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Бот с таким именем уже существует' });
        console.error("[API Error] /bots POST:", error);
        res.status(500).json({ error: 'Не удалось создать бота' });
    }
});

router.put('/:id', authorize('bot:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        
        const { 
            username, password, prefix, serverId, note,
            proxyHost, proxyPort, proxyUsername, proxyPassword 
        } = req.body;

        let dataToUpdate = {
            username,
            prefix,
            note,
            proxyHost,
            proxyPort: proxyPort ? parseInt(proxyPort, 10) : null,
            proxyUsername,
        };

        if (password) {
            dataToUpdate.password = encrypt(password);
        }
        if (proxyPassword) {
            dataToUpdate.proxyPassword = encrypt(proxyPassword);
        }

        if (proxyPassword) {
            dataToUpdate.proxyPassword = proxyPassword;
        }

        if (serverId) {
            dataToUpdate.serverId = parseInt(serverId, 10);
        }
        
        if (dataToUpdate.serverId) {
             const { serverId: sId, ...rest } = dataToUpdate;
             dataToUpdate = { ...rest, server: { connect: { id: sId } } };
        }

        const updatedBot = await prisma.bot.update({ 
            where: { id: botId }, 
            data: dataToUpdate, 
            include: { server: true } 
        });
        
        res.json(updatedBot);
    } catch (error) {
        console.error("Update bot error:", error);
        if (error.code === 'P2002') return res.status(409).json({ error: 'Бот с таким именем уже существует' });
        res.status(500).json({ error: 'Не удалось обновить бота' });
    }
});

router.delete('/:id', authorize('bot:delete'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        if (BotManager.bots.has(botId)) return res.status(400).json({ error: 'Нельзя удалить запущенного бота' });
        await prisma.bot.delete({ where: { id: botId } });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Не удалось удалить бота' }); }
});


router.post('/:id/start', authorize('bot:start_stop'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        const botConfig = await prisma.bot.findUnique({ where: { id: botId }, include: { server: true } });
        if (!botConfig) return res.status(404).json({ error: 'Бот не найден' });
        const result = await BotManager.startBot(botConfig);
        res.json(result);
    } catch (error) { res.status(500).json({ error: 'Ошибка при запуске бота: ' + error.message }); }
});

router.post('/:id/stop', authorize('bot:start_stop'), (req, res) => {
    const botId = parseInt(req.params.id, 10);
    const result = BotManager.stopBot(botId);
    res.json(result);
});

router.post('/:id/chat', authorize('bot:interact'), (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        const result = BotManager.sendMessageToBot(botId, message);
        if (result.success) res.json({ success: true });
        else res.status(404).json(result);
    } catch (error) { res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message }); }
});

router.get('/:id/export', authorize('bot:export'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        const {
            includeCommands = 'true',
            includePermissions = 'true',
            includePluginFiles = 'true'
        } = req.query;

        const bot = await prisma.bot.findUnique({
            where: { id: botId },
            include: { server: true, installedPlugins: true },
        });

        if (!bot) {
            return res.status(404).json({ error: 'Бот не найден' });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.setHeader('Content-Disposition', `attachment; filename="bot-${bot.username}-export.zip"`);
        res.setHeader('Content-Type', 'application/zip');
        archive.pipe(res);

        const exportMetadata = {
            version: '1.2-configurable',
            bot: {
                username: bot.username,
                prefix: bot.prefix,
                note: bot.note,
                server: { host: bot.server.host, port: bot.server.port, version: bot.server.version },
                proxy: { host: bot.proxyHost, port: bot.proxyPort },
            },
            plugins: bot.installedPlugins.map(p => ({
                name: p.name,
                folderName: path.basename(p.path),
                isEnabled: p.isEnabled,
                settings: p.settings,
                sourceUri: p.sourceType === 'GITHUB' ? p.sourceUri : null,
            })),
        };

        if (includeCommands === 'true') {
            exportMetadata.commands = await prisma.command.findMany({ where: { botId } });
        }
        if (includePermissions === 'true') {
            exportMetadata.permissions = await prisma.permission.findMany({ where: { botId } });
            exportMetadata.groups = await prisma.group.findMany({ where: { botId }, include: { permissions: { select: { permission: { select: { name: true } } } } } });
            exportMetadata.users = await prisma.user.findMany({ where: { botId }, include: { groups: { select: { group: { select: { name: true } } } } } });
        }

        archive.append(JSON.stringify(exportMetadata, null, 2), { name: 'bot_export.json' });

        if (includePluginFiles === 'true') {
            for (const plugin of bot.installedPlugins) {
                const pluginFolderName = path.basename(plugin.path);
                try {
                    await fs.access(plugin.path);
                    archive.directory(plugin.path, `plugins/${pluginFolderName}`);
                } catch (error) {
                    console.warn(`[Export] Директория плагина ${plugin.name} (${plugin.path}) не найдена, пропускаем.`);
                }
            }
        }

        await archive.finalize();

    } catch (error) {
        console.error("Bot export error:", error);
        res.status(500).json({ error: 'Не удалось экспортировать бота.' });
    }
});

router.post('/import', upload.single('file'), authorize('bot:import'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Файл не загружен.');
    }
    if (path.extname(req.file.originalname).toLowerCase() !== '.zip') return res.status(400).json({ error: 'Неверный формат файла. Ожидался ZIP-архив.' });
    
    const zip = new AdmZip(req.file.buffer);
    const metadataEntry = zip.getEntry('bot_export.json');
    if (!metadataEntry) return res.status(400).json({ error: 'Файл bot_export.json не найден в архиве.' });

    const importMetadata = JSON.parse(metadataEntry.getData().toString('utf-8'));
    const { bot: botData, plugins: pluginsInfo, commands, permissions, groups, users } = importMetadata;

    const existingBot = await prisma.bot.findUnique({ where: { username: botData.username } });
    if (existingBot) return res.status(409).json({ error: `Бот с именем "${botData.username}" уже существует.` });

    let newBotId;
    let botStorageDir;
    try {
        await prisma.$transaction(async (tx) => {
            let server = await tx.server.findFirst({ where: { host: botData.server.host, port: botData.server.port } });
            if (!server) server = await tx.server.create({ data: { name: botData.server.host, host: botData.server.host, port: botData.server.port, version: botData.server.version } });
            const newBot = await tx.bot.create({ data: { username: botData.username, prefix: botData.prefix, note: botData.note, serverId: server.id, proxyHost: botData.proxy?.host, proxyPort: botData.proxy?.port } });
            newBotId = newBot.id;
            
            if (permissions && groups && users) {
                const permMap = new Map();
                for (const perm of permissions) {
                    const newPerm = await tx.permission.create({ data: { botId: newBotId, name: perm.name, description: perm.description, owner: perm.owner } });
                    permMap.set(perm.name, newPerm.id);
                }

                const groupMap = new Map();
                for (const group of groups) {
                    const newGroup = await tx.group.create({
                        data: {
                            botId: newBotId,
                            name: group.name,
                            owner: group.owner,
                            permissions: { create: group.permissions.map(p => ({ permissionId: permMap.get(p.permission.name) })).filter(p => p.permissionId) }
                        }
                    });
                    groupMap.set(group.name, newGroup.id);
                }

                for (const user of users) {
                    await tx.user.create({
                        data: {
                            botId: newBotId,
                            username: user.username,
                            isBlacklisted: user.isBlacklisted,
                            groups: { create: user.groups.map(g => ({ groupId: groupMap.get(g.group.name) })).filter(g => g.groupId) }
                        }
                    });
                }
            } else {
                await setupDefaultPermissionsForBot(newBotId, tx);
            }

            if (commands) {
                for (const cmd of commands) {
                    const permName = permissions?.find(p => p.id === cmd.permissionId)?.name;
                    const permId = permName ? (await tx.permission.findUnique({where: {botId_name: {botId: newBotId, name: permName}}}))?.id : null;
                    
                    await tx.command.create({
                        data: {
                            botId: newBotId,
                            name: cmd.name,
                            isEnabled: cmd.isEnabled,
                            cooldown: cmd.cooldown,
                            aliases: cmd.aliases,
                            description: cmd.description,
                            owner: cmd.owner,
                            permissionId: permId,
                            allowedChatTypes: cmd.allowedChatTypes,
                        }
                    });
                }
            }

            botStorageDir = path.resolve(__dirname, `../../../storage/plugins/bot_${newBotId}`);
            await fs.mkdir(botStorageDir, { recursive: true });
            const pluginsDirInZip = zip.getEntry('plugins/');

            if (pluginsDirInZip && pluginsDirInZip.isDirectory) {
                zip.extractEntryTo('plugins/', botStorageDir, true, true);
                for (const pInfo of pluginsInfo) {
                    const targetPath = path.join(botStorageDir, 'plugins', pInfo.folderName);
                    const packageJson = JSON.parse(await fs.readFile(path.join(targetPath, 'package.json'), 'utf-8'));
                    await tx.installedPlugin.create({
                        data: { botId: newBotId, name: pInfo.name, version: packageJson.version, description: packageJson.description, path: targetPath, sourceType: 'IMPORTED', sourceUri: `imported_from_${req.file.originalname}`, manifest: JSON.stringify(packageJson.botpanel || {}), isEnabled: pInfo.isEnabled, settings: pInfo.settings }
                    });
                }
            } else {
                for (const pInfo of pluginsInfo) {
                    if (pInfo.sourceUri) {
                        const newPlugin = await PluginManager.installFromGithub(newBotId, pInfo.sourceUri, tx);
                        await tx.installedPlugin.update({ where: { id: newPlugin.id }, data: { isEnabled: pInfo.isEnabled, settings: pInfo.settings } });
                    }
                }
            }
        });

        const finalBot = await prisma.bot.findUnique({ where: { id: newBotId }});
        res.status(201).json(finalBot);

    } catch (error) {
        console.error("[API Error] /import POST:", error);
        if (botStorageDir) {
            await fs.rm(botStorageDir, { recursive: true, force: true }).catch(() => {});
        }
        res.status(500).json({ error: `Не удалось импортировать бота: ${error.message}` });
    }
});


router.get('/:botId/plugins', authorize('plugin:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const plugins = await prisma.installedPlugin.findMany({ where: { botId } });
        res.json(plugins);
    } catch (error) { res.status(500).json({ error: 'Не удалось получить плагины бота' }); }
});

router.post('/:botId/plugins/install/github', authorize('plugin:install'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const { repoUrl } = req.body;
        const newPlugin = await PluginManager.installFromGithub(botId, repoUrl);
        res.status(201).json(newPlugin);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/:botId/plugins/register/local', authorize('plugin:install'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const { path } = req.body;
        const newPlugin = await PluginManager.installFromLocalPath(botId, path);
        res.status(201).json(newPlugin);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/:botId/plugins/:pluginId', authorize('plugin:delete'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        await PluginManager.deletePlugin(pluginId);
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:botId/plugins/:pluginId/settings', authorize('plugin:settings:view'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) return res.status(404).json({ error: 'Установленный плагин не найден' });

        const savedSettings = plugin.settings ? JSON.parse(plugin.settings) : {};
        let defaultSettings = {};
        const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};

        if (manifest.settings) {
            for (const key in manifest.settings) {
                const config = manifest.settings[key];
                if (config.type === 'json_file' && config.defaultPath) {
                    const configFilePath = path.join(plugin.path, config.defaultPath);
                    try {
                        const fileContent = await fs.readFile(configFilePath, 'utf-8');
                        defaultSettings[key] = JSON.parse(fileContent);
                    } catch (e) { defaultSettings[key] = {}; }
                } else {
                    try { defaultSettings[key] = JSON.parse(config.default || 'null'); } 
                    catch { defaultSettings[key] = config.default; }
                }
            }
        }
        const finalSettings = { ...defaultSettings, ...savedSettings };
        res.json(finalSettings);
    } catch (error) {
        console.error("[API Error] /settings GET:", error);
        res.status(500).json({ error: 'Не удалось получить настройки плагина' });
    }
});

router.put('/:botId/plugins/:pluginId', authorize('plugin:settings:edit'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const { isEnabled, settings } = req.body;
        const dataToUpdate = {};
        if (typeof isEnabled === 'boolean') dataToUpdate.isEnabled = isEnabled;
        if (settings) dataToUpdate.settings = JSON.stringify(settings);
        if (Object.keys(dataToUpdate).length === 0) return res.status(400).json({ error: "Нет данных для обновления" });
        const updated = await prisma.installedPlugin.update({ where: { id: pluginId }, data: dataToUpdate });
        res.json(updated);
    } catch (error) { res.status(500).json({ error: 'Не удалось обновить плагин' }); }
});


router.get('/:botId/management-data', authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        
        const commandTemplates = commandManager.getCommandTemplates();
        const templatesMap = new Map(commandTemplates.map(t => [t.name, t]));

        let dbCommands = await prisma.command.findMany({ where: { botId }, orderBy: [{ owner: 'asc' }, { name: 'asc' }] });

        const dbCommandNames = new Set(dbCommands.map(cmd => cmd.name));
        const commandsToCreate = [];

        for (const template of commandTemplates) {
            if (!dbCommandNames.has(template.name)) {
                let permissionId = null;
                if (template.permissions) {
                    const permission = await prisma.permission.upsert({
                        where: { botId_name: { botId, name: template.permissions } },
                        update: { description: `Авто-создано для команды ${template.name}` },
                        create: {
                            botId,
                            name: template.permissions,
                            description: `Авто-создано для команды ${template.name}`,
                            owner: template.owner || 'system',
                        }
                    });
                    permissionId = permission.id;
                }

                commandsToCreate.push({
                    botId,
                    name: template.name,
                    isEnabled: template.isActive,
                    cooldown: template.cooldown,
                    aliases: JSON.stringify(template.aliases),
                    description: template.description,
                    owner: template.owner,
                    permissionId: permissionId,
                    allowedChatTypes: JSON.stringify(template.allowedChatTypes),
                });
            }
        }

        if (commandsToCreate.length > 0) {
            await prisma.command.createMany({ data: commandsToCreate });
            dbCommands = await prisma.command.findMany({ where: { botId }, orderBy: [{ owner: 'asc' }, { name: 'asc' }] });
        }

        const finalCommands = dbCommands.map(cmd => {
            const template = templatesMap.get(cmd.name);
            return {
                ...cmd,
                args: template ? template.args : [],
                aliases: JSON.parse(cmd.aliases || '[]'),
                allowedChatTypes: JSON.parse(cmd.allowedChatTypes || '[]')
            };
        })

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 100;

        const userSkip = (page - 1) * pageSize;

        const [groups, users, allPermissions, usersCount] = await Promise.all([
            prisma.group.findMany({ where: { botId }, include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } }),
            prisma.user.findMany({
                where: { botId },
                include: { groups: { include: { group: true } } },
                orderBy: { username: 'asc' },
                take: pageSize,
                skip: userSkip,
            }),
            prisma.permission.findMany({ where: { botId }, orderBy: { name: 'asc' } }),
            prisma.user.count({ where: { botId } })
        ]);

        res.json({
            groups,
            permissions: allPermissions,
            users: {
                items: users,
                total: usersCount,
                page,
                pageSize,
                totalPages: Math.ceil(usersCount / pageSize),
            },
            commands: finalCommands
        });
        
    } catch (error) {
        console.error(`[API Error] /management-data for bot ${req.params.botId}:`, error);
        res.status(500).json({ error: 'Не удалось загрузить данные управления' });
    }
});

router.put('/:botId/commands/:commandId', authorize('management:edit'), async (req, res) => {
    try {
        const commandId = parseInt(req.params.commandId, 10);
        const botId = parseInt(req.params.botId, 10);
        const { isEnabled, cooldown, aliases, permissionId, allowedChatTypes } = req.body;

        const dataToUpdate = {};
        if (typeof isEnabled === 'boolean') dataToUpdate.isEnabled = isEnabled;
        if (typeof cooldown === 'number') dataToUpdate.cooldown = cooldown;
        if (Array.isArray(aliases)) dataToUpdate.aliases = JSON.stringify(aliases);
        if (permissionId !== undefined) {
            dataToUpdate.permissionId = permissionId === null ? null : parseInt(permissionId, 10);
        }
        if (Array.isArray(allowedChatTypes)) {
            dataToUpdate.allowedChatTypes = JSON.stringify(allowedChatTypes);
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ error: "Нет данных для обновления" });
        }

        const updatedCommand = await prisma.command.update({
            where: { id: commandId, botId: botId },
            data: dataToUpdate,
        });

        BotManager.reloadBotConfigInRealTime(botId);

        res.json(updatedCommand);
    } catch (error) {
        console.error(`[API Error] /commands/:commandId PUT:`, error);
        res.status(500).json({ error: 'Не удалось обновить команду' });
    }
});

router.post('/:botId/groups', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const { name, permissionIds } = req.body;
        if (!name) return res.status(400).json({ error: "Имя группы обязательно" });

        const newGroup = await prisma.group.create({
            data: {
                name,
                botId,
                owner: 'admin',
                permissions: { create: (permissionIds || []).map(id => ({ permissionId: id })) }
            }
        });

        BotManager.reloadBotConfigInRealTime(botId);


        res.status(201).json(newGroup);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Группа с таким именем уже существует для этого бота.' });
        res.status(500).json({ error: 'Не удалось создать группу.' });
    }
});

router.put('/:botId/groups/:groupId', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const groupId = parseInt(req.params.groupId);
        const { name, permissionIds } = req.body;
        if (!name) return res.status(400).json({ error: "Имя группы обязательно" });

        const usersInGroup = await prisma.user.findMany({
            where: { botId, groups: { some: { groupId } } },
            select: { username: true }
        });

        await prisma.$transaction(async (tx) => {
            await tx.group.update({ where: { id: groupId }, data: { name } });
            await tx.groupPermission.deleteMany({ where: { groupId } });
            if (permissionIds && permissionIds.length > 0) {
                await tx.groupPermission.createMany({
                    data: permissionIds.map(pid => ({ groupId, permissionId: pid })),
                });
            }
        });

        for (const user of usersInGroup) {
            BotManager.invalidateUserCache(botId, user.username);
        }

        BotManager.reloadBotConfigInRealTime(botId);

        res.status(200).send();
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Группа с таким именем уже существует для этого бота.' });
        res.status(500).json({ error: 'Не удалось обновить группу.' });
    }
});

router.delete('/:botId/groups/:groupId', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const groupId = parseInt(req.params.groupId);
        const group = await prisma.group.findUnique({ where: { id: groupId } });
        if (group && group.owner !== 'admin') {
            return res.status(403).json({ error: `Нельзя удалить группу с источником "${group.owner}".` });
        }
        await prisma.group.delete({ where: { id: groupId } });
        BotManager.reloadBotConfigInRealTime(botId);


        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Не удалось удалить группу.' }); }
});

router.post('/:botId/permissions', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: 'Имя права обязательно' });
        const newPermission = await prisma.permission.create({
            data: { name, description, botId, owner: 'admin' }
        });

        BotManager.reloadBotConfigInRealTime(botId);
        
        res.status(201).json(newPermission);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'Право с таким именем уже существует для этого бота.' });
        res.status(500).json({ error: 'Не удалось создать право.' });
    }
});

router.put('/:botId/users/:userId', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const userId = parseInt(req.params.userId, 10);
        const { isBlacklisted, groupIds } = req.body;

        const updateData = {};
        if (typeof isBlacklisted === 'boolean') {
            updateData.isBlacklisted = isBlacklisted;
        }

        if (Array.isArray(groupIds)) {
            await prisma.userGroup.deleteMany({ where: { userId } });
            updateData.groups = {
                create: groupIds.map(gid => ({ groupId: gid })),
            };
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: { groups: true }
        });

        BotManager.invalidateUserCache(botId, updatedUser.username);

        UserService.clearCache(updatedUser.username, botId);

        res.json(updatedUser);

    } catch (error) {
        console.error(`[API Error] /users/:userId PUT:`, error);
        res.status(500).json({ error: 'Не удалось обновить пользователя' });
    }
});


router.post('/start-all', authorize('bot:start_stop'), async (req, res) => {
    try {
        console.log('[API] Получен запрос на запуск всех ботов.');
        const allBots = await prisma.bot.findMany({ include: { server: true } });
        let startedCount = 0;
        for (const botConfig of allBots) {
            if (!BotManager.bots.has(botConfig.id)) {
                await BotManager.startBot(botConfig);
                startedCount++;
            }
        }
        res.json({ success: true, message: `Запущено ${startedCount} ботов.` });
    } catch (error) {
        console.error('[API Error] /start-all:', error);
        res.status(500).json({ error: 'Произошла ошибка при массовом запуске ботов.' });
    }
});

router.post('/stop-all', authorize('bot:start_stop'), (req, res) => {
    try {
        console.log('[API] Получен запрос на остановку всех ботов.');
        const botIds = Array.from(BotManager.bots.keys());
        let stoppedCount = 0;
        for (const botId of botIds) {
            BotManager.stopBot(botId);
            stoppedCount++;
        }
        res.json({ success: true, message: `Остановлено ${stoppedCount} ботов.` });
    } catch (error) {
        console.error('[API Error] /stop-all:', error);
        res.status(500).json({ error: 'Произошла ошибка при массовой остановке ботов.' });
    }
});


router.get('/:id/settings/all', authorize('bot:update'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);

        const bot = await prisma.bot.findUnique({
            where: { id: botId },
            include: {
                server: true,
                installedPlugins: {
                    orderBy: { name: 'asc' }
                }
            }
        });

        if (!bot) {
            return res.status(404).json({ error: 'Бот не найден' });
        }

        const allSettings = {
            bot: {
                id: bot.id,
                username: bot.username,
                prefix: bot.prefix,
                note: bot.note,
                serverId: bot.serverId,
                proxyHost: bot.proxyHost,
                proxyPort: bot.proxyPort,
                proxyUsername: bot.proxyUsername,
            },
            plugins: []
        };

        const pluginSettingsPromises = bot.installedPlugins.map(async (plugin) => {
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            
            if (!manifest.settings || Object.keys(manifest.settings).length === 0) {
                return null;
            }

            const savedSettings = plugin.settings ? JSON.parse(plugin.settings) : {};
            let defaultSettings = {};

            for (const key in manifest.settings) {
                const config = manifest.settings[key];
                if (config.type === 'json_file' && config.defaultPath) {
                    const configFilePath = path.join(plugin.path, config.defaultPath);
                    try {
                        const fileContent = await fs.readFile(configFilePath, 'utf-8');
                        defaultSettings[key] = JSON.parse(fileContent);
                    } catch (e) { defaultSettings[key] = {}; }
                } else {
                    try { defaultSettings[key] = JSON.parse(config.default || 'null'); } 
                    catch { defaultSettings[key] = config.default; }
                }
            }

            return {
                id: plugin.id,
                name: plugin.name,
                description: plugin.description,
                isEnabled: plugin.isEnabled,
                manifest: manifest,
                settings: { ...defaultSettings, ...savedSettings }
            };
        });

        allSettings.plugins = (await Promise.all(pluginSettingsPromises)).filter(Boolean);

        res.json(allSettings);

    } catch (error) {
        console.error("[API Error] /settings/all GET:", error);
        res.status(500).json({ error: 'Не удалось загрузить все настройки' });
    }
});

module.exports = router;