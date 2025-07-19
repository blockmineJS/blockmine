const express = require('express');
const prisma = require('../../lib/prisma');
const path = require('path');
const fs = require('fs/promises');
const fse = require('fs-extra');
const { botManager, pluginManager } = require('../../core/services');
const UserService = require('../../core/UserService');
const commandManager = require('../../core/system/CommandManager');
const NodeRegistry = require('../../core/NodeRegistry');
const { authenticate, authorize } = require('../middleware/auth');
const { encrypt } = require('../../core/utils/crypto');
const { randomUUID } = require('crypto');
const eventGraphsRouter = require('./eventGraphs');
const pluginIdeRouter = require('./pluginIde');

const multer = require('multer');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const os = require('os');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use(authenticate);
router.use('/:botId/event-graphs', eventGraphsRouter);
router.use('/:botId/plugins/ide', pluginIdeRouter);

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
        const state = botManager.getFullState();
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
        const { 
            username, password, prefix, serverId, note, owners,
            proxyHost, proxyPort, proxyUsername, proxyPassword 
        } = req.body;

        let dataToUpdate = {
            username,
            prefix,
            note,
            owners,
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

        if (serverId !== undefined && serverId !== '') {
            dataToUpdate.serverId = parseInt(serverId, 10);
        }
        
        Object.keys(dataToUpdate).forEach(key => {
            if (dataToUpdate[key] === undefined) {
                delete dataToUpdate[key];
            }
        });
        
        if (dataToUpdate.serverId) {
            const serverIdValue = dataToUpdate.serverId;
            delete dataToUpdate.serverId;
            dataToUpdate.server = { connect: { id: serverIdValue } };
        }
        
        const botId = parseInt(req.params.id, 10);
        if (isNaN(botId)) {
            return res.status(400).json({ message: 'Неверный ID бота.' });
        }

        const updatedBot = await prisma.bot.update({
            where: { id: botId },
            data: dataToUpdate,
            include: {
                server: true
            }
        });

        const botManager = req.app.get('botManager');
        botManager.reloadBotConfigInRealTime(botId);

        res.json(updatedBot);
    } catch (error) {
        console.error('Error updating bot:', error);
        res.status(500).json({ message: `Не удалось обновить бота: ${error.message}` });
    }
});

router.delete('/:id', authorize('bot:delete'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        if (botManager.bots.has(botId)) return res.status(400).json({ error: 'Нельзя удалить запущенного бота' });
        await prisma.bot.delete({ where: { id: botId } });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Не удалось удалить бота' }); }
});

router.post('/:id/start', authorize('bot:start_stop'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        const botConfig = await prisma.bot.findUnique({ where: { id: botId }, include: { server: true } });
        if (!botConfig) {
            return res.status(404).json({ success: false, message: 'Бот не найден' });
        }
        botManager.startBot(botConfig);
        res.status(202).json({ success: true, message: 'Команда на запуск отправлена.' });
    } catch (error) { 
        console.error(`[API] Ошибка запуска бота ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Ошибка при запуске бота: ' + error.message }); 
    }
});

router.post('/:id/stop', authorize('bot:start_stop'), (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        botManager.stopBot(botId);
        res.status(202).json({ success: true, message: 'Команда на остановку отправлена.' });
    } catch (error) {
        console.error(`[API] Ошибка остановки бота ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Ошибка при остановке бота: ' + error.message });
    }
});

router.post('/:id/chat', authorize('bot:interact'), (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        const result = botManager.sendMessageToBot(botId, message);
        if (result.success) res.json({ success: true });
        else res.status(404).json(result);
    } catch (error) { res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message }); }
});


router.get('/servers', authorize('bot:list'), async (req, res) => {
    try {
        const servers = await prisma.server.findMany();
        res.json(servers);
    } catch (error) {
        console.error("[API /api/bots] Ошибка получения списка серверов:", error);
        res.status(500).json({ error: 'Не удалось получить список серверов' });
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
    const { botId } = req.params;
    const { repoUrl } = req.body;
    try {
        const newPlugin = await pluginManager.installFromGithub(parseInt(botId), repoUrl);
        res.status(201).json(newPlugin);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:botId/plugins/install/local', authorize('plugin:install'), async (req, res) => {
    const { botId } = req.params;
    const { path } = req.body;
    try {
        const newPlugin = await pluginManager.installFromLocalPath(parseInt(botId), path);
        res.status(201).json(newPlugin);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:botId/plugins/:pluginId', authorize('plugin:delete'), async (req, res) => {
    const { pluginId } = req.params;
    try {
        await pluginManager.deletePlugin(parseInt(pluginId));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
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
        const botId = parseInt(req.params.botId, 10);
        if (isNaN(botId)) return res.status(400).json({ error: 'Неверный ID бота' });

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 100;
        const searchQuery = req.query.search || '';

        const userSkip = (page - 1) * pageSize;

        const whereClause = {
            botId,
        };

        if (searchQuery) {
            whereClause.username = {
                contains: searchQuery,
            };
        }

        const [groups, allPermissions] = await Promise.all([
            prisma.group.findMany({ where: { botId }, include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } }),
            prisma.permission.findMany({ where: { botId }, orderBy: { name: 'asc' } })
        ]);

        const [users, usersCount] = await Promise.all([
            prisma.user.findMany({
                where: whereClause,
                include: { groups: { include: { group: true } } },
                orderBy: { username: 'asc' },
                take: pageSize,
                skip: userSkip,
            }),
            prisma.user.count({ where: whereClause })
        ]);

        const templatesMap = new Map(commandManager.getCommandTemplates().map(t => [t.name, t]));
        let dbCommandsFromDb = await prisma.command.findMany({ 
            where: { botId },
            include: {
                pluginOwner: {
                    select: {
                        id: true,
                        name: true,
                        version: true,
                        sourceType: true
                    }
                }
            },
            orderBy: [{ owner: 'asc' }, { name: 'asc' }] 
        });

        const commandsToCreate = [];
        for (const template of templatesMap.values()) {
            if (!dbCommandsFromDb.some(cmd => cmd.name === template.name)) {
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
            dbCommandsFromDb = await prisma.command.findMany({ 
                where: { botId },
                include: {
                    pluginOwner: {
                        select: {
                            id: true,
                            name: true,
                            version: true,
                            sourceType: true
                        }
                    }
                },
                orderBy: [{ owner: 'asc' }, { name: 'asc' }] 
            });
        }

        const finalCommands = dbCommandsFromDb.map(cmd => {
            const template = templatesMap.get(cmd.name);
            let args = [];

            if (cmd.isVisual) {
                try {
                    args = JSON.parse(cmd.argumentsJson || '[]');
                } catch (e) {
                    console.error(`Error parsing argumentsJson for visual command ${cmd.name} (ID: ${cmd.id}):`, e);
                    args = [];
                }
            } else {
                if (template && template.args && template.args.length > 0) {
                    args = template.args;
                } else {
                    try {
                        args = JSON.parse(cmd.argumentsJson || '[]');
                    } catch (e) {
                        args = [];
                    }
                }
            }

            return {
                ...cmd,
                args: args,
                aliases: JSON.parse(cmd.aliases || '[]'),
                allowedChatTypes: JSON.parse(cmd.allowedChatTypes || '[]'),
            };
        })

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
        const { name, description, cooldown, aliases, permissionId, allowedChatTypes, isEnabled, argumentsJson, graphJson, pluginOwnerId } = req.body;

        const dataToUpdate = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (description !== undefined) dataToUpdate.description = description;
        if (cooldown !== undefined) dataToUpdate.cooldown = parseInt(cooldown, 10);
        if (aliases !== undefined) dataToUpdate.aliases = Array.isArray(aliases) ? JSON.stringify(aliases) : aliases;
        if (permissionId !== undefined) dataToUpdate.permissionId = permissionId ? parseInt(permissionId, 10) : null;
        if (allowedChatTypes !== undefined) dataToUpdate.allowedChatTypes = Array.isArray(allowedChatTypes) ? JSON.stringify(allowedChatTypes) : allowedChatTypes;
        if (isEnabled !== undefined) dataToUpdate.isEnabled = isEnabled;
        if (argumentsJson !== undefined) dataToUpdate.argumentsJson = Array.isArray(argumentsJson) ? JSON.stringify(argumentsJson) : argumentsJson;
        if (graphJson !== undefined) dataToUpdate.graphJson = graphJson;
        if (pluginOwnerId !== undefined) dataToUpdate.pluginOwnerId = pluginOwnerId;

        const updatedCommand = await prisma.command.update({
            where: { id: commandId },
            data: dataToUpdate,
        });

        if (graphJson && updatedCommand.pluginOwnerId) {
            try {
                const plugin = await prisma.installedPlugin.findUnique({
                    where: { id: updatedCommand.pluginOwnerId }
                });
                
                if (plugin) {
                    const graphDir = path.join(plugin.path, 'graph');
                    await fse.mkdir(graphDir, { recursive: true });
                    
                    const graphFile = path.join(graphDir, `${updatedCommand.name}.json`);
                    await fse.writeJson(graphFile, JSON.parse(graphJson), { spaces: 2 });
                    console.log(`[API] Граф команды ${updatedCommand.name} сохранен в ${graphFile}`);
                }
            } catch (error) {
                console.error(`[API] Ошибка сохранения графа в папку плагина:`, error);
            }
        }

        res.json(updatedCommand);
    } catch (error) {
        console.error(`[API Error] /commands/:commandId PUT:`, error);
        res.status(500).json({ error: 'Failed to update command' });
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

        botManager.reloadBotConfigInRealTime(botId);

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
            botManager.invalidateUserCache(botId, user.username);
        }

        botManager.reloadBotConfigInRealTime(botId);

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
        botManager.reloadBotConfigInRealTime(botId);

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

        botManager.reloadBotConfigInRealTime(botId);
        
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

        botManager.invalidateUserCache(botId, updatedUser.username);

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
            if (!botManager.bots.has(botConfig.id)) {
                await botManager.startBot(botConfig);
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
        const botIds = Array.from(botManager.bots.keys());
        let stoppedCount = 0;
        for (const botId of botIds) {
            botManager.stopBot(botId);
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
                owners: bot.owners,
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

const nodeRegistry = require('../../core/NodeRegistry'); 

router.get('/:botId/visual-editor/nodes', authorize('management:view'), (req, res) => {
    try {
        const { graphType } = req.query;
        const nodesByCategory = nodeRegistry.getNodesByCategory(graphType);
        res.json(nodesByCategory);
    } catch (error) {
        console.error('[API Error] /visual-editor/nodes GET:', error);
        res.status(500).json({ error: 'Failed to get available nodes' });
    }
});

router.get('/:botId/visual-editor/node-config', authorize('management:view'), (req, res) => {
    try {
        const { types } = req.query;
        if (!types) {
            return res.status(400).json({ error: 'Node types must be provided' });
        }
        const typeArray = Array.isArray(types) ? types : [types];
        const config = nodeRegistry.getNodesByTypes(typeArray);
        res.json(config);
    } catch (error) {
        console.error('[API Error] /visual-editor/node-config GET:', error);
        res.status(500).json({ error: 'Failed to get node configuration' });
    }
});

router.get('/:botId/visual-editor/permissions', authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const permissions = await prisma.permission.findMany({ 
            where: { botId },
            orderBy: { name: 'asc' }
        });
        res.json(permissions);
    } catch (error) {
        console.error('[API Error] /visual-editor/permissions GET:', error);
        res.status(500).json({ error: 'Failed to get permissions' });
    }
});

router.post('/:botId/commands/visual', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const {
            name,
            description,
            aliases = [],
            permissionId,
            cooldown = 0,
            allowedChatTypes = ['chat', 'private'],
            argumentsJson = '[]',
            graphJson = 'null'
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Command name is required' });
        }

        const newCommand = await prisma.command.create({
            data: {
                botId,
                name,
                description,
                aliases: JSON.stringify(aliases),
                permissionId: permissionId || null,
                cooldown,
                allowedChatTypes: JSON.stringify(allowedChatTypes),
                isVisual: true,
                argumentsJson,
                graphJson,
                pluginOwnerId: null
            }
        });

        botManager.reloadBotConfigInRealTime(botId);
        res.status(201).json(newCommand);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Command with this name already exists' });
        }
        console.error('[API Error] /commands/visual POST:', error);
        res.status(500).json({ error: 'Failed to create visual command' });
    }
});

router.put('/:botId/commands/:commandId/visual', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const commandId = parseInt(req.params.commandId, 10);
        const {
            name,
            description,
            aliases,
            permissionId,
            cooldown,
            allowedChatTypes,
            argumentsJson,
            graphJson
        } = req.body;

        const dataToUpdate = { isVisual: true };
        
        if (name) dataToUpdate.name = name;
        if (description !== undefined) dataToUpdate.description = description;
        if (Array.isArray(aliases)) dataToUpdate.aliases = JSON.stringify(aliases);
        if (permissionId !== undefined) dataToUpdate.permissionId = permissionId || null;
        if (typeof cooldown === 'number') dataToUpdate.cooldown = cooldown;
        if (Array.isArray(allowedChatTypes)) dataToUpdate.allowedChatTypes = JSON.stringify(allowedChatTypes);
        if (argumentsJson !== undefined) dataToUpdate.argumentsJson = argumentsJson;
        if (graphJson !== undefined) dataToUpdate.graphJson = graphJson;

        const updatedCommand = await prisma.command.update({
            where: { id: commandId, botId },
            data: dataToUpdate
        });

        if (graphJson && updatedCommand.pluginOwnerId) {
            try {
                const plugin = await prisma.installedPlugin.findUnique({
                    where: { id: updatedCommand.pluginOwnerId }
                });
                
                if (plugin) {
                    const graphDir = path.join(plugin.path, 'graph');
                    await fse.mkdir(graphDir, { recursive: true });
                    
                    const graphFile = path.join(graphDir, `${updatedCommand.name}.json`);
                    await fse.writeJson(graphFile, JSON.parse(graphJson), { spaces: 2 });
                    console.log(`[API] Граф команды ${updatedCommand.name} сохранен в ${graphFile}`);
                }
            } catch (error) {
                console.error(`[API] Ошибка сохранения графа в папку плагина:`, error);
            }
        }

        botManager.reloadBotConfigInRealTime(botId);
        res.json(updatedCommand);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Command with this name already exists' });
        }
        console.error('[API Error] /commands/:commandId/visual PUT:', error);
        res.status(500).json({ error: 'Failed to update visual command' });
    }
});

router.get('/:botId/commands/:commandId/export', authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const commandId = parseInt(req.params.commandId, 10);

        const command = await prisma.command.findUnique({
            where: { id: commandId, botId: botId },
        });

        if (!command) {
            return res.status(404).json({ error: 'Command not found' });
        }

        const exportData = {
            version: '1.0',
            type: 'command',
            ...command
        };
        
        delete exportData.id;
        delete exportData.botId;

        res.json(exportData);
    } catch (error) {
        console.error('Failed to export command:', error);
        res.status(500).json({ error: 'Failed to export command' });
    }
});

router.post('/:botId/commands/import', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const importData = req.body;

        if (importData.type !== 'command') {
            return res.status(400).json({ error: 'Invalid file type. Expected "command".' });
        }

        let commandName = importData.name;
        let counter = 1;

        while (await prisma.command.findFirst({ where: { botId, name: commandName } })) {
            commandName = `${importData.name}_imported_${counter}`;
            counter++;
        }

        let finalGraphJson = importData.graphJson;

        if (finalGraphJson && finalGraphJson !== 'null') {
            const graph = JSON.parse(finalGraphJson);
            const nodeIdMap = new Map();

            if (graph.nodes) {
                graph.nodes.forEach(node => {
                    const oldId = node.id;
                    const newId = `${node.type}-${randomUUID()}`;
                    nodeIdMap.set(oldId, newId);
                    node.id = newId;
                });
            }

            if (graph.connections) {
                graph.connections.forEach(conn => {
                    conn.id = `edge-${randomUUID()}`;
                    conn.sourceNodeId = nodeIdMap.get(conn.sourceNodeId) || conn.sourceNodeId;
                    conn.targetNodeId = nodeIdMap.get(conn.targetNodeId) || conn.targetNodeId;
                });
            }

            finalGraphJson = JSON.stringify(graph);
        }

        const newCommand = await prisma.command.create({
            data: {
                botId: botId,
                name: commandName,
                description: importData.description,
                aliases: importData.aliases,
                permissionId: null,
                cooldown: importData.cooldown,
                allowedChatTypes: importData.allowedChatTypes,
                isVisual: importData.isVisual,
                isEnabled: importData.isEnabled,
                argumentsJson: importData.argumentsJson,
                graphJson: finalGraphJson,
                owner: 'visual_editor',
            }
        });

        botManager.reloadBotConfigInRealTime(botId);
        res.status(201).json(newCommand);
    } catch (error) {
        console.error("Failed to import command:", error);
        res.status(500).json({ error: 'Failed to import command' });
    }
});

router.post('/:botId/commands', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const {
            name,
            description,
            aliases = [],
            permissionId,
            cooldown = 0,
            allowedChatTypes = ['chat', 'private'],
            isVisual = false,
            argumentsJson = '[]',
            graphJson = 'null'
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Command name is required' });
        }

        const newCommand = await prisma.command.create({
            data: {
                botId,
                name,
                description,
                aliases: JSON.stringify(aliases),
                permissionId: permissionId || null,
                cooldown,
                allowedChatTypes: JSON.stringify(allowedChatTypes),
                isVisual,
                argumentsJson,
                graphJson,
                owner: isVisual ? 'visual_editor' : 'manual',
                pluginOwnerId: null
            }
        });

        if (graphJson && graphJson !== 'null' && req.body.pluginOwnerId) {
            try {
                const plugin = await prisma.installedPlugin.findUnique({
                    where: { id: req.body.pluginOwnerId }
                });
                
                if (plugin) {
                    const graphDir = path.join(plugin.path, 'graph');
                    await fse.mkdir(graphDir, { recursive: true });
                    
                    const graphFile = path.join(graphDir, `${name}.json`);
                    await fse.writeJson(graphFile, JSON.parse(graphJson), { spaces: 2 });
                    console.log(`[API] Граф команды ${name} сохранен в ${graphFile}`);
                }
            } catch (error) {
                console.error(`[API] Ошибка сохранения графа в папку плагина:`, error);
            }
        }

        botManager.reloadBotConfigInRealTime(botId);
        res.status(201).json(newCommand);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Command with this name already exists' });
        }
        console.error('[API Error] /commands POST:', error);
        res.status(500).json({ error: 'Failed to create command' });
    }
});

router.delete('/:botId/commands/:commandId', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const commandId = parseInt(req.params.commandId, 10);

        await prisma.command.delete({
            where: { id: commandId, botId: botId },
        });

        botManager.reloadBotConfigInRealTime(botId);
        res.status(204).send();
    } catch (error) {
        console.error(`[API Error] /commands/:commandId DELETE:`, error);
        res.status(500).json({ error: 'Failed to delete command' });
    }
});

router.get('/:botId/event-graphs/:graphId', authorize('management:view'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const graphId = parseInt(req.params.graphId, 10);

        const eventGraph = await prisma.eventGraph.findUnique({
            where: { id: graphId, botId },
            include: { triggers: true },
        });

        if (!eventGraph) {
            return res.status(404).json({ error: 'Граф события не найден' });
        }

        res.json(eventGraph);
    } catch (error) {
        console.error(`[API Error] /event-graphs/:graphId GET:`, error);
        res.status(500).json({ error: 'Не удалось получить граф события' });
    }
});

router.post('/:botId/event-graphs', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Имя графа обязательно и должно быть непустой строкой' });
        }

        const initialGraph = {
            nodes: [],
            connections: []
        };

        const newEventGraph = await prisma.eventGraph.create({
            data: {
                botId,
                name: name.trim(),
                isEnabled: true,
                graphJson: JSON.stringify(initialGraph),
                variables: '[]'
            },
        });

        res.status(201).json(newEventGraph);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Граф событий с таким именем уже существует' });
        }
        console.error(`[API Error] /event-graphs POST:`, error);
        res.status(500).json({ error: 'Не удалось создать граф событий' });
    }
});

router.delete('/:botId/event-graphs/:graphId', authorize('management:edit'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const graphId = parseInt(req.params.graphId, 10);

        await prisma.eventGraph.delete({
            where: { id: graphId, botId: botId },
        });

        res.status(204).send();
    } catch (error) {
        console.error(`[API Error] /event-graphs/:graphId DELETE:`, error);
        res.status(500).json({ error: 'Не удалось удалить граф событий' });
    }
});

router.put('/:botId/event-graphs/:graphId', authorize('management:edit'), async (req, res) => {
    const { botId, graphId } = req.params;
    const { name, isEnabled, graphJson, variables, pluginOwnerId } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Поле name обязательно и должно быть непустой строкой.' });
    }

    if (typeof isEnabled !== 'boolean') {
        return res.status(400).json({ error: 'Поле isEnabled должно быть true или false.' });
    }

    try {
        const dataToUpdate = {
            name: name.trim(),
            isEnabled,
        };

        if (graphJson !== undefined) {
            dataToUpdate.graphJson = graphJson;
        }

        if (variables !== undefined) {
            dataToUpdate.variables = Array.isArray(variables) ? JSON.stringify(variables) : variables;
        }

        if (pluginOwnerId !== undefined) {
            dataToUpdate.pluginOwnerId = pluginOwnerId;
        }

        const updatedGraph = await prisma.eventGraph.update({
            where: { id: parseInt(graphId), botId: parseInt(botId) },
            data: dataToUpdate
        });
        
        res.json(updatedGraph);
    } catch (error) {
        console.error(`[API Error] /event-graphs/:graphId PUT:`, error);
        res.status(500).json({ error: 'Ошибка при обновлении графа событий.' });
    }
});

router.post('/:botId/visual-editor/save', authorize('management:edit'), async (req, res) => {
});

router.get('/:botId/ui-extensions', authorize('plugin:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const enabledPlugins = await prisma.installedPlugin.findMany({
            where: { botId: botId, isEnabled: true }
        });

        const extensions = [];
        for (const plugin of enabledPlugins) {
            if (plugin.manifest) {
                try {
                    const manifest = JSON.parse(plugin.manifest);
                    if (manifest.uiExtensions && Array.isArray(manifest.uiExtensions)) {
                        manifest.uiExtensions.forEach(ext => {
                            extensions.push({
                                pluginName: plugin.name,
                                ...ext
                            });
                        });
                    }
                } catch (e) {
                    console.error(`Ошибка парсинга манифеста для плагина ${plugin.name}:`, e);
                }
            }
        }
        res.json(extensions);
    } catch (error) {
        res.status(500).json({ error: 'Не удалось получить расширения интерфейса' });
    }
});

router.get('/:botId/plugins/:pluginName/ui-content/:path', authorize('plugin:list'), async (req, res) => {
    const { botId, pluginName, path: uiPath } = req.params;
    const numericBotId = parseInt(botId, 10);

    try {
        const plugin = await prisma.installedPlugin.findFirst({
            where: { botId: numericBotId, name: pluginName, isEnabled: true }
        });

        if (!plugin) {
            return res.status(404).json({ error: `Активный плагин "${pluginName}" не найден для этого бота.` });
        }

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
                    } catch (e) { defaultSettings[key] = {}; }
                } else {
                    try { defaultSettings[key] = JSON.parse(config.default || 'null'); } 
                    catch { defaultSettings[key] = config.default; }
                }
            }
        }
        const finalSettings = { ...defaultSettings, ...savedSettings };
        
        const mainFilePath = manifest.main || 'index.js';
        const pluginEntryPoint = path.join(plugin.path, mainFilePath);
        
        delete require.cache[require.resolve(pluginEntryPoint)];
        const pluginModule = require(pluginEntryPoint);

        if (typeof pluginModule.getUiPageContent !== 'function') {
            return res.status(501).json({ error: `Плагин "${pluginName}" не предоставляет кастомный UI контент.` });
        }
        
        const botProcess = botManager.bots.get(numericBotId);
        const botApi = botProcess ? botProcess.api : null;
        
        const content = await pluginModule.getUiPageContent({
            path: uiPath,
            bot: botApi,
            botId: numericBotId,
            settings: finalSettings
        });

        if (content === null) {
            return res.status(404).json({ error: `Для пути "${uiPath}" не найдено содержимого в плагине "${pluginName}".` });
        }

        res.json(content);

    } catch (error) {
        console.error(`[UI Content] Ошибка при получении контента для плагина "${pluginName}":`, error);
        res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера.' });
    }
});


router.post('/:botId/plugins/:pluginName/action', authorize('plugin:list'), async (req, res) => {
    const { botId, pluginName } = req.params;
    const { actionName, payload } = req.body;
    const numericBotId = parseInt(botId, 10);

    if (!actionName) {
        return res.status(400).json({ error: 'Необходимо указать "actionName".' });
    }

    try {
        const botProcess = botManager.bots.get(numericBotId);
        
        if (!botProcess) {
            return res.status(404).json({ error: 'Бот не найден или не запущен.' });
        }

        const plugin = await prisma.installedPlugin.findFirst({
            where: { botId: numericBotId, name: pluginName, isEnabled: true }
        });

        if (!plugin) {
            return res.status(404).json({ error: `Активный плагин с таким именем "${pluginName}" не найден.` });
        }

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
                        console.error(`[Action] Не удалось прочитать defaultPath для ${pluginName}: ${e.message}`);
                        defaultSettings[key] = {}; 
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

        const mainFilePath = manifest.main || 'index.js';
        const pluginPath = path.join(plugin.path, mainFilePath);
        
        delete require.cache[require.resolve(pluginPath)];
        const pluginModule = require(pluginPath);

        if (typeof pluginModule.handleAction !== 'function') {
            return res.status(501).json({ error: `Плагин "${pluginName}" не поддерживает обработку действий.` });
        }
        
        const result = await pluginModule.handleAction({
            botProcess: botProcess,
            botId: numericBotId,
            action: actionName,
            payload: payload,
            settings: finalSettings
        });

        res.json({ success: true, message: 'Действие выполнено.', result: result || null });

    } catch (error) {
        console.error(`Ошибка выполнения действия "${actionName}" для плагина "${pluginName}":`, error);
        res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера.' });
    }
});


router.get('/:botId/export', authorize('bot:export'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId, 10);
        const {
            includeCommands,
            includePermissions,
            includePluginFiles,
            includePluginDataStore,
            includeEventGraphs,
        } = req.query;

        const bot = await prisma.bot.findUnique({ where: { id: botId } });
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`bot_${bot.username}_export_${new Date().toISOString()}.zip`);
        archive.pipe(res);

        const botData = { ...bot };
        delete botData.password;
        delete botData.proxyPassword;
        archive.append(JSON.stringify(botData, null, 2), { name: 'bot.json' });

        if (includeCommands === 'true') {
            const commands = await prisma.command.findMany({ where: { botId } });
            archive.append(JSON.stringify(commands, null, 2), { name: 'commands.json' });
        }

        if (includePermissions === 'true') {
            const users = await prisma.user.findMany({ where: { botId }, include: { groups: { include: { group: true } } } });
            const groups = await prisma.group.findMany({ where: { botId }, include: { permissions: { include: { permission: true } } } });
            const permissions = await prisma.permission.findMany({ where: { botId } });
            const permissionsData = { users, groups, permissions };
            archive.append(JSON.stringify(permissionsData, null, 2), { name: 'permissions.json' });
        }
        
        if (includeEventGraphs === 'true') {
            const eventGraphs = await prisma.eventGraph.findMany({ where: { botId } });
            archive.append(JSON.stringify(eventGraphs, null, 2), { name: 'event_graphs.json' });
        }

        if (includePluginFiles === 'true' || includePluginDataStore === 'true') {
            const installedPlugins = await prisma.installedPlugin.findMany({ where: { botId } });
            archive.append(JSON.stringify(installedPlugins, null, 2), { name: 'plugins.json' });

            if (includePluginFiles === 'true') {
                for (const plugin of installedPlugins) {
                    const pluginPath = plugin.path;
                    if (await fs.stat(pluginPath).then(s => s.isDirectory()).catch(() => false)) {
                        archive.directory(pluginPath, `plugins/${plugin.name}`);
                    }
                }
            }
            if (includePluginDataStore === 'true') {
                console.log(`[Export] Экспорт PluginDataStore для бота ${botId}`);
                const pluginDataStore = await prisma.pluginDataStore.findMany({ 
                    where: { botId: parseInt(botId) } 
                });
                console.log(`[Export] Найдено записей PluginDataStore: ${pluginDataStore.length}`);
                if (pluginDataStore.length > 0) {
                    archive.append(JSON.stringify(pluginDataStore, null, 2), { name: 'plugin_data_store.json' });
                    console.log(`[Export] Данные PluginDataStore добавлены в архив`);
                } else {
                    console.log(`[Export] Нет данных PluginDataStore для экспорта`);
                }
            }
        }

        await archive.finalize();

    } catch (error) {
        console.error('Failed to export bot:', error);
        res.status(500).json({ error: `Failed to export bot: ${error.message}` });
    }
});

router.post('/import', authorize('bot:create'), upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const botIdMap = new Map();

    try {
        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();

        const botDataEntry = zipEntries.find(e => e.entryName === 'bot.json');
        if (!botDataEntry) {
            return res.status(400).json({ error: 'Archive missing bot.json' });
        }
        const botData = JSON.parse(botDataEntry.getData().toString('utf8'));

        const server = await prisma.server.findFirst();
        if (!server) {
            return res.status(500).json({ error: 'No servers configured in the target system.' });
        }

        let newBotName = botData.username;
        let counter = 1;
        while (await prisma.bot.findFirst({ where: { username: newBotName } })) {
            newBotName = `${botData.username}_imported_${counter}`;
            counter++;
        }

        const newBot = await prisma.bot.create({
            data: {
                ...botData,
                id: undefined, 
                username: newBotName,
                serverId: server.id, 
                password: null, 
                proxyPassword: null
            },
            include: { server: true }
        });
        
        botIdMap.set(botData.id, newBot.id);

        const permissionsEntry = zipEntries.find(e => e.entryName === 'permissions.json');
        let pMap = new Map();
        
        if (permissionsEntry) {
            const { users, groups, permissions } = JSON.parse(permissionsEntry.getData().toString('utf8'));
            
            await setupDefaultPermissionsForBot(newBot.id, prisma);
            
            for(let p of permissions.filter(p=>p.owner === 'system')) {
                const existingPermission = await prisma.permission.findFirst({
                    where: { 
                        botId: newBot.id, 
                        name: p.name,
                        owner: 'system'
                    }
                });
                if (existingPermission) {
                    pMap.set(p.id, existingPermission.id);
                }
            }
            
            for(let p of permissions.filter(p=>p.owner !== 'system')) {
                const newP = await prisma.permission.create({ data: { ...p, id: undefined, botId: newBot.id }});
                pMap.set(p.id, newP.id);
            }

            const gMap = new Map();
            for(let g of groups.filter(g=>g.owner !== 'system')) {
                const newG = await prisma.group.create({ data: { ...g, id: undefined, botId: newBot.id, permissions: {
                    create: g.permissions.map(gp => ({ permissionId: pMap.get(gp.permissionId) })).filter(p=>p.permissionId)
                }}});
                gMap.set(g.id, newG.id);
            }
            
            for(let u of users) {
                await prisma.user.create({ data: { ...u, id: undefined, botId: newBot.id, groups: {
                    create: u.groups.map(ug => ({ groupId: gMap.get(ug.groupId) })).filter(g=>g.groupId)
                }}});
            }
        }

        const pluginDataStoreEntry = zipEntries.find(e => e.entryName === 'plugin_data_store.json');
        if (pluginDataStoreEntry) {
            console.log(`[Import] Импорт PluginDataStore для бота ${newBot.id}`);
            const pluginDataStore = JSON.parse(pluginDataStoreEntry.getData().toString('utf8'));
            console.log(`[Import] Найдено записей PluginDataStore: ${pluginDataStore.length}`);
            
            for (let dataRecord of pluginDataStore) {
                delete dataRecord.id;
                dataRecord.botId = newBot.id;
                await prisma.pluginDataStore.create({ data: dataRecord });
            }
            console.log(`[Import] PluginDataStore успешно импортирован`);
        }

        const pluginsEntry = zipEntries.find(e => e.entryName === 'plugins.json');
        let pluginMap = new Map();
        
        if (pluginsEntry) {
            const plugins = JSON.parse(pluginsEntry.getData().toString('utf8'));
            const pluginsDir = path.join(os.homedir(), '.blockmine', 'storage', 'plugins');
            const botPluginsDir = path.join(pluginsDir, newBot.username);
            await fs.mkdir(botPluginsDir, { recursive: true });

            for (let pluginData of plugins) {
                const oldPath = pluginData.path;
                const pluginName = pluginData.name;
                const newPluginPath = path.join(botPluginsDir, pluginName);

                const oldPluginId = pluginData.id;
                delete pluginData.id;
                pluginData.botId = newBot.id;
                pluginData.path = path.resolve(newPluginPath);
                
                for (const entry of zipEntries) {
                    if (entry.entryName.startsWith(`plugins/${pluginName}/`)) {
                        const relativePath = entry.entryName.replace(`plugins/${pluginName}/`, '');
                        if (relativePath) {
                            const destPath = path.join(newPluginPath, relativePath);
                            const destDir = path.dirname(destPath);
                            await fs.mkdir(destDir, { recursive: true });
                            
                            if (!entry.isDirectory) {
                                await fs.writeFile(destPath, entry.getData());
                            }
                        }
                    }
                }
                
                const newPlugin = await prisma.installedPlugin.create({ data: pluginData });
                pluginMap.set(oldPluginId, newPlugin.id);
            }
        }

        const commandsEntry = zipEntries.find(e => e.entryName === 'commands.json');
        if (commandsEntry) {
            const commands = JSON.parse(commandsEntry.getData().toString('utf8'));
            for (let command of commands) {
                delete command.id;
                command.botId = newBot.id;
                
                if (command.permissionId && pMap.has(command.permissionId)) {
                    command.permissionId = pMap.get(command.permissionId);
                } else {
                    command.permissionId = null;
                }
                
                if (command.pluginOwnerId && pluginMap.has(command.pluginOwnerId)) {
                    command.pluginOwnerId = pluginMap.get(command.pluginOwnerId);
                } else {
                    command.pluginOwnerId = null;
                }
                
                try {
                    await prisma.command.create({ data: command });
                } catch (error) {
                    console.warn(`[Import] Пропущена команда ${command.name}: ${error.message}`);
                }
            }
        }
        
        const eventGraphsEntry = zipEntries.find(e => e.entryName === 'event_graphs.json');
        if (eventGraphsEntry) {
            const eventGraphs = JSON.parse(eventGraphsEntry.getData().toString('utf8'));
            for (let graph of eventGraphs) {
                delete graph.id;
                graph.botId = newBot.id;
                
                if (graph.pluginOwnerId && pluginMap.has(graph.pluginOwnerId)) {
                    graph.pluginOwnerId = pluginMap.get(graph.pluginOwnerId);
                } else {
                    graph.pluginOwnerId = null;
                }
                
                try {
                    await prisma.eventGraph.create({ data: graph });
                } catch (error) {
                    console.warn(`[Import] Пропущен граф ${graph.name}: ${error.message}`);
                }
            }
        }
        
        res.status(201).json(newBot);

    } catch (error) {
        console.error('Failed to import bot:', error);
        res.status(500).json({ error: `Failed to import bot: ${error.message}` });
    }
});

module.exports = router;
