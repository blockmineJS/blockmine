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
const apiKeysRouter = require('./apiKeys');
const { deepMergeSettings } = require('../../core/utils/settingsMerger');
const { checkBotAccess } = require('../middleware/botAccess');
const { filterSecretSettings, prepareSettingsForSave } = require('../../core/utils/secretsFilter');

const multer = require('multer');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const os = require('os');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.use('/:botId(\\d+)/*', authenticate, (req, res, next) => checkBotAccess(req, res, next));

const conditionalRestartAuth = (req, res, next) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
        console.log('[Debug] Роут перезапуска бота доступен без проверки прав');
        return next();
    }
    
    return authenticate(req, res, (err) => {
        if (err) return next(err);
        return authorize('bot:start_stop')(req, res, next);
    });
};

const conditionalChatAuth = (req, res, next) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
        console.log('[Debug] Роут отправки сообщения боту доступен без проверки прав');
        return next();
    }
    
    return authenticate(req, res, (err) => {
        if (err) return next(err);
        return authorize('bot:interact')(req, res, next);
    });
};

const conditionalStartStopAuth = (req, res, next) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
        console.log('[Debug] Роут запуска/остановки бота доступен без проверки прав');
        return next();
    }
    
    return authenticate(req, res, (err) => {
        if (err) return next(err);
        return authorize('bot:start_stop')(req, res, next);
    });
};

const conditionalListAuth = (req, res, next) => {
    return authenticate(req, res, (err) => {
        if (err) return next(err);
        if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
            return next();
        }
        return authorize('bot:list')(req, res, next);
    });
};

router.post('/:id/restart', conditionalRestartAuth, authenticate, checkBotAccess, async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        botManager.stopBot(botId);
        setTimeout(async () => {
            const botConfig = await prisma.bot.findUnique({ where: { id: botId }, include: { server: true } });
            if (!botConfig) {
                return res.status(404).json({ success: false, message: 'Бот не найден' });
            }
            botManager.startBot(botConfig);
            res.status(202).json({ success: true, message: 'Команда на перезапуск отправлена.' });
        }, 1000);
    } catch (error) {
        console.error(`[API] Ошибка перезапуска бота ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Ошибка при перезапуске бота: ' + error.message });
    }
});

router.post('/:id/chat', conditionalChatAuth, authenticate, checkBotAccess, (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Сообщение не может быть пустым' });
        const result = botManager.sendMessageToBot(botId, message);
        if (result.success) res.json({ success: true });
        else res.status(404).json(result);
    } catch (error) { res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message }); }
});

router.post('/:id/start', conditionalStartStopAuth, authenticate, checkBotAccess, async (req, res) => {
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

router.post('/:id/stop', conditionalStartStopAuth, authenticate, checkBotAccess, (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        botManager.stopBot(botId);
        res.status(202).json({ success: true, message: 'Команда на остановку отправлена.' });
    } catch (error) {
        console.error(`[API] Ошибка остановки бота ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Ошибка при остановке бота: ' + error.message });
    }
});

router.get('/', conditionalListAuth, async (req, res) => {
    try {
        const botsWithoutSortOrder = await prisma.bot.findMany({
            where: { sortOrder: null },
            select: { id: true }
        });
        
        if (botsWithoutSortOrder.length > 0) {
            console.log(`[API] Обновляем sortOrder для ${botsWithoutSortOrder.length} ботов`);
            
            const maxSortOrder = await prisma.bot.aggregate({
                _max: { sortOrder: true }
            });
            
            let nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;
            
            for (const bot of botsWithoutSortOrder) {
                await prisma.bot.update({
                    where: { id: bot.id },
                    data: { sortOrder: nextSortOrder }
                });
                console.log(`[API] Установлен sortOrder ${nextSortOrder} для бота ${bot.id}`);
                nextSortOrder++;
            }
        }

        let whereFilter = {};
        if (req.user && typeof req.user.userId === 'number') {
            const panelUser = await prisma.panelUser.findUnique({
                where: { id: req.user.userId },
                include: { botAccess: { select: { botId: true } } }
            });
            if (panelUser && panelUser.allBots === false) {
                const allowedIds = panelUser.botAccess.map(a => a.botId);
                whereFilter = { id: { in: allowedIds.length ? allowedIds : [-1] } };
            }
        }
        
        const bots = await prisma.bot.findMany({ 
            where: whereFilter,
            include: { server: true }, 
            orderBy: { sortOrder: 'asc' } 
        });
        res.json(bots);
    } catch (error) { 
        console.error("[API /api/bots] Ошибка получения списка ботов:", error);
        res.status(500).json({ error: 'Не удалось получить список ботов' }); 
    }
});

router.get('/state', conditionalListAuth, (req, res) => {
    try {
        const state = botManager.getFullState();
        res.json(state);
    } catch (error) { res.status(500).json({ error: 'Не удалось получить состояние ботов' }); }
});

router.put('/bulk-proxy-update', authenticate, authorize('bot:update'), async (req, res) => {
    try {
        const { botIds, proxySettings } = req.body;
        
        if (!Array.isArray(botIds) || botIds.length === 0) {
            return res.status(400).json({ error: 'Bot IDs array is required and cannot be empty' });
        }
        
        if (!proxySettings || !proxySettings.proxyHost || !proxySettings.proxyPort) {
            return res.status(400).json({ error: 'Proxy host and port are required' });
        }
        
        if (proxySettings.proxyPort < 1 || proxySettings.proxyPort > 65535) {
            return res.status(400).json({ error: 'Proxy port must be between 1 and 65535' });
        }
        
        const accessibleBots = [];
        const inaccessibleBots = [];
        
        for (const botId of botIds) {
            try {
                const userId = req.user?.userId;
                if (!userId) {
                    inaccessibleBots.push(botId);
                    continue;
                }

                const botIdInt = parseInt(botId, 10);
                if (isNaN(botIdInt)) {
                    inaccessibleBots.push(botId);
                    continue;
                }

                const user = await prisma.panelUser.findUnique({
                    where: { id: userId },
                    include: { botAccess: { select: { botId: true } } }
                });
                
                if (!user) {
                    inaccessibleBots.push(botId);
                    continue;
                }

                if (user.allBots !== false || user.botAccess.some((a) => a.botId === botIdInt)) {
                    accessibleBots.push(botIdInt);
                } else {
                    inaccessibleBots.push(botId);
                }
            } catch (error) {
                console.error(`Error checking access for bot ${botId}:`, error);
                inaccessibleBots.push(botId);
            }
        }
        
        if (accessibleBots.length === 0) {
            return res.status(403).json({ error: 'No accessible bots in the provided list' });
        }
        
        const encryptedSettings = {
            proxyHost: proxySettings.proxyHost.trim(),
            proxyPort: parseInt(proxySettings.proxyPort),
            proxyUsername: proxySettings.proxyUsername ? proxySettings.proxyUsername.trim() : null,
            proxyPassword: proxySettings.proxyPassword ? encrypt(proxySettings.proxyPassword) : null
        };
        
        const updatedBots = await prisma.$transaction(
            accessibleBots.map(botId => 
                prisma.bot.update({
                    where: { id: parseInt(botId) },
                    data: encryptedSettings,
                    include: {
                        server: {
                            select: {
                                id: true,
                                name: true,
                                host: true,
                                port: true,
                                version: true
                            }
                        }
                    }
                })
            )
        );
        
        if (req.io) {
            req.io.emit('bots-updated', updatedBots);
        }
        
        res.json({
            success: true,
            message: `Proxy settings updated for ${updatedBots.length} bot(s)`,
            updatedBots: updatedBots.map(bot => ({
                id: bot.id,
                username: bot.username,
                proxyHost: bot.proxyHost,
                proxyPort: bot.proxyPort,
                server: bot.server
            })),
            inaccessibleBots: inaccessibleBots,
            errors: inaccessibleBots.length > 0 ? [`Access denied to ${inaccessibleBots.length} bot(s)`] : []
        });
        
    } catch (error) {
        console.error('Bulk proxy update error:', error);
        res.status(500).json({ 
            error: 'Failed to update proxy settings',
            details: error.message 
        });
    }
});

router.get('/:id/logs', conditionalListAuth, authenticate, checkBotAccess, (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        const { limit = 50, offset = 0 } = req.query;
        
        const logs = botManager.getBotLogs(botId);
        
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedLogs = logs.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: {
                logs: paginatedLogs,
                pagination: {
                    total: logs.length,
                    limit: parseInt(limit),
                    offset: startIndex,
                    hasMore: endIndex < logs.length
                }
            }
        });
    } catch (error) { 
        console.error(`[API] Ошибка получения логов бота ${req.params.id}:`, error);
        res.status(500).json({ error: 'Не удалось получить логи бота' }); 
    }
});

router.use(authenticate);
router.use('/:botId/event-graphs', eventGraphsRouter);
router.use('/:botId/plugins/ide', pluginIdeRouter);
router.use('/:botId/api-keys', apiKeysRouter);

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



router.post('/', authorize('bot:create'), async (req, res) => {
    try {
        const { username, password, prefix, serverId, note } = req.body;
        if (!username || !serverId) return res.status(400).json({ error: 'Имя и сервер обязательны' });
        
        const maxSortOrder = await prisma.bot.aggregate({
            _max: { sortOrder: true }
        });
        const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;
        
        const data = { 
            username, 
            prefix, 
            note, 
            serverId: parseInt(serverId, 10),
            password: password ? encrypt(password) : null,
            sortOrder: nextSortOrder
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

router.put('/:id', authenticate, checkBotAccess, authorize('bot:update'), async (req, res) => {
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

        if (dataToUpdate.username) {
            const existingBot = await prisma.bot.findFirst({
                where: {
                    username: dataToUpdate.username,
                    id: { not: botId }
                }
            });
            
            if (existingBot) {
                return res.status(400).json({ 
                    message: `Бот с именем "${dataToUpdate.username}" уже существует.` 
                });
            }
        }

        const updatedBot = await prisma.bot.update({
            where: { id: botId },
            data: dataToUpdate,
            include: { server: true }
        });

        res.json(updatedBot);
    } catch (error) {
        console.error("[API Error] /bots PUT:", error);
        res.status(500).json({ error: 'Не удалось обновить бота' });
    }
});

router.put('/:id/sort-order', authenticate, checkBotAccess, authorize('bot:update'), async (req, res) => {
    try {
        const { newPosition, oldIndex, newIndex } = req.body;
        const botId = parseInt(req.params.id, 10);
        
        console.log(`[API] Запрос на изменение порядка бота ${botId}: oldIndex=${oldIndex}, newIndex=${newIndex}, newPosition=${newPosition}`);
        
        if (isNaN(botId)) {
            console.log(`[API] Неверный botId: ${botId}`);
            return res.status(400).json({ error: 'Неверный ID бота' });
        }

        const allBots = await prisma.bot.findMany({
            orderBy: { sortOrder: 'asc' },
            select: { id: true, sortOrder: true }
        });

        console.log(`[API] Всего ботов: ${allBots.length}`);
        const currentBotIndex = allBots.findIndex(bot => bot.id === botId);
        if (currentBotIndex === -1) {
            console.log(`[API] Бот ${botId} не найден`);
            return res.status(404).json({ error: 'Бот не найден' });
        }

        if (newIndex < 0 || newIndex >= allBots.length) {
            console.log(`[API] Неверная новая позиция: ${newIndex}`);
            return res.status(400).json({ error: 'Неверная позиция' });
        }

        if (currentBotIndex === newIndex) {
            console.log(`[API] Позиция не изменилась для бота ${botId}`);
            return res.json({ success: true, message: 'Позиция не изменилась' });
        }
        const reorderedBots = [...allBots];
        const [movedBot] = reorderedBots.splice(currentBotIndex, 1);
        reorderedBots.splice(newIndex, 0, movedBot);

        console.log(`[API] Обновляем порядок для всех ботов`);
        for (let i = 0; i < reorderedBots.length; i++) {
            const bot = reorderedBots[i];
            const newSortOrder = i + 1; // 1-based позиции
            
            if (bot.sortOrder !== newSortOrder) {
                await prisma.bot.update({
                    where: { id: bot.id },
                    data: { sortOrder: newSortOrder }
                });
                console.log(`[API] Обновлен бот ${bot.id}: sortOrder ${bot.sortOrder} -> ${newSortOrder}`);
            }
        }

        console.log(`[API] Успешно обновлен порядок бота ${botId}`);
        res.json({ success: true, message: 'Порядок ботов обновлен' });
    } catch (error) {
        console.error("[API Error] /bots sort-order PUT:", error);
        res.status(500).json({ error: 'Не удалось обновить порядок ботов' });
    }
});

router.delete('/:id', authenticate, checkBotAccess, authorize('bot:delete'), async (req, res) => {
    try {
        const botId = parseInt(req.params.id, 10);
        if (botManager.bots.has(botId)) return res.status(400).json({ error: 'Нельзя удалить запущенного бота' });
        await prisma.bot.delete({ where: { id: botId } });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Не удалось удалить бота' }); }
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

router.get('/:botId/plugins', authenticate, checkBotAccess, authorize('plugin:list'), async (req, res) => {
    try {
        const botId = parseInt(req.params.botId);
        const plugins = await prisma.installedPlugin.findMany({ where: { botId } });
        res.json(plugins);
    } catch (error) { res.status(500).json({ error: 'Не удалось получить плагины бота' }); }
});

router.post('/:botId/plugins/install/github', authenticate, checkBotAccess, authorize('plugin:install'), async (req, res) => {
    const { botId } = req.params;
    const { repoUrl } = req.body;
    try {
        const newPlugin = await pluginManager.installFromGithub(parseInt(botId), repoUrl);
        res.status(201).json(newPlugin);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:botId/plugins/install/local', authenticate, checkBotAccess, authorize('plugin:install'), async (req, res) => {
    const { botId } = req.params;
    const { path } = req.body;
    try {
        const newPlugin = await pluginManager.installFromLocalPath(parseInt(botId), path);
        res.status(201).json(newPlugin);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:botId/plugins/:pluginId', authenticate, checkBotAccess, authorize('plugin:delete'), async (req, res) => {
    const { pluginId } = req.params;
    try {
        await pluginManager.deletePlugin(parseInt(pluginId));
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:botId/plugins/:pluginId/settings', authenticate, checkBotAccess, authorize('plugin:settings:view'), async (req, res) => {
	try {
		const pluginId = parseInt(req.params.pluginId);
		const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
		if (!plugin) return res.status(404).json({ error: 'Установленный плагин не найден' });

		const savedSettings = plugin.settings ? JSON.parse(plugin.settings) : {};
		const defaultSettings = {};
		const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
		const manifestSettings = manifest.settings || {};


		const firstSettingValue = Object.values(manifestSettings)[0];
		const isGrouped = firstSettingValue && typeof firstSettingValue === 'object' && !firstSettingValue.type && firstSettingValue.label;

		const processSetting = async (settingKey, config) => {
			if (!config || !config.type) return;

			if (config.type === 'json_file' && config.defaultPath) {
				const configFilePath = path.join(plugin.path, config.defaultPath);
				try {
					const fileContent = await fs.readFile(configFilePath, 'utf-8');
					defaultSettings[settingKey] = JSON.parse(fileContent);
				} catch (e) {
					console.error(`[API Settings] Не удалось прочитать defaultPath ${config.defaultPath} для плагина ${plugin.name}: ${e.message}`);
					defaultSettings[settingKey] = {};
				}
			} else if (config.default !== undefined) {
				try {
					defaultSettings[settingKey] = JSON.parse(config.default);
				} catch {
					defaultSettings[settingKey] = config.default;
				}
			}
		};

		if (isGrouped) {
			for (const categoryKey in manifestSettings) {
				const categoryConfig = manifestSettings[categoryKey];
				for (const settingKey in categoryConfig) {
					if (settingKey === 'label') continue;
					await processSetting(settingKey, categoryConfig[settingKey]);
				}
			}
		} else {
			for (const settingKey in manifestSettings) {
				await processSetting(settingKey, manifestSettings[settingKey]);
			}
		}

		const finalSettings = deepMergeSettings(defaultSettings, savedSettings);
		
		// Фильтруем секретные значения перед отправкой на фронтенд
		const filteredSettings = filterSecretSettings(finalSettings, manifestSettings, isGrouped);
		
		res.json(filteredSettings);
	} catch (error) {
		console.error("[API Error] /settings GET:", error);
		res.status(500).json({ error: 'Не удалось получить настройки плагина' });
	}
});

router.get('/:botId/plugins/:pluginId/data', authenticate, checkBotAccess, authorize('plugin:settings:view'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) return res.status(404).json({ error: 'Установленный плагин не найден' });

        const rows = await prisma.pluginDataStore.findMany({
            where: { botId: plugin.botId, pluginName: plugin.name },
            orderBy: { updatedAt: 'desc' }
        });

        const result = rows.map(r => {
            let value;
            try { value = JSON.parse(r.value); } catch { value = r.value; }
            return { key: r.key, value, createdAt: r.createdAt, updatedAt: r.updatedAt };
        });
        res.json(result);
    } catch (error) { res.status(500).json({ error: 'Не удалось получить данные плагина' }); }
});

router.get('/:botId/plugins/:pluginId/data/:key', authenticate, checkBotAccess, authorize('plugin:settings:view'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const { key } = req.params;
        const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) return res.status(404).json({ error: 'Установленный плагин не найден' });

        const row = await prisma.pluginDataStore.findUnique({
            where: {
                pluginName_botId_key: {
                    pluginName: plugin.name,
                    botId: plugin.botId,
                    key
                }
            }
        });
        if (!row) return res.status(404).json({ error: 'Ключ не найден' });
        let value; try { value = JSON.parse(row.value); } catch { value = row.value; }
        res.json({ key: row.key, value, createdAt: row.createdAt, updatedAt: row.updatedAt });
    } catch (error) { res.status(500).json({ error: 'Не удалось получить значение по ключу' }); }
});

router.put('/:botId/plugins/:pluginId/data/:key', authenticate, checkBotAccess, authorize('plugin:settings:edit'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const { key } = req.params;
        const { value } = req.body;
        const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) return res.status(404).json({ error: 'Установленный плагин не найден' });

        const jsonValue = JSON.stringify(value ?? null);
        const upserted = await prisma.pluginDataStore.upsert({
            where: {
                pluginName_botId_key: {
                    pluginName: plugin.name,
                    botId: plugin.botId,
                    key
                }
            },
            update: { value: jsonValue },
            create: { pluginName: plugin.name, botId: plugin.botId, key, value: jsonValue }
        });
        let parsed; try { parsed = JSON.parse(upserted.value); } catch { parsed = upserted.value; }
        res.json({ key: upserted.key, value: parsed, createdAt: upserted.createdAt, updatedAt: upserted.updatedAt });
    } catch (error) { res.status(500).json({ error: 'Не удалось сохранить значение' }); }
});

router.delete('/:botId/plugins/:pluginId/data/:key', authenticate, checkBotAccess, authorize('plugin:settings:edit'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const { key } = req.params;
        const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) return res.status(404).json({ error: 'Установленный плагин не найден' });

        await prisma.pluginDataStore.delete({
            where: {
                pluginName_botId_key: {
                    pluginName: plugin.name,
                    botId: plugin.botId,
                    key
                }
            }
        });
        res.status(204).send();
    } catch (error) { res.status(500).json({ error: 'Не удалось удалить значение' }); }
});

router.put('/:botId/plugins/:pluginId', authenticate, checkBotAccess, authorize('plugin:settings:edit'), async (req, res) => {
    try {
        const pluginId = parseInt(req.params.pluginId);
        const { isEnabled, settings } = req.body;
        const dataToUpdate = {};
        
        if (typeof isEnabled === 'boolean') dataToUpdate.isEnabled = isEnabled;
        
        if (settings) {
            // Получаем существующий плагин для обработки секретных значений
            const plugin = await prisma.installedPlugin.findUnique({ where: { id: pluginId } });
            if (!plugin) return res.status(404).json({ error: 'Плагин не найден' });
            
            const manifest = plugin.manifest ? JSON.parse(plugin.manifest) : {};
            const existingSettings = plugin.settings ? JSON.parse(plugin.settings) : {};
            const manifestSettings = manifest.settings || {};
            
            // Определяем, использует ли плагин группированные настройки
            const firstSettingValue = Object.values(manifestSettings)[0];
            const isGrouped = firstSettingValue && typeof firstSettingValue === 'object' && !firstSettingValue.type && firstSettingValue.label;
            
            // Подготавливаем настройки для сохранения (сохраняем существующие значения для замаскированных секретов)
            const settingsToSave = prepareSettingsForSave(settings, existingSettings, manifestSettings, isGrouped);

            // Валидация структуры settingsToSave
            const isValidSettings =
                settingsToSave &&
                typeof settingsToSave === 'object' &&
                !Array.isArray(settingsToSave) &&
                Object.keys(settingsToSave).length > 0;

            if (!isValidSettings) {
                console.error("[Validation Error] prepareSettingsForSave вернул некорректную структуру:", settingsToSave);
                return res.status(400).json({ error: "Некорректная структура настроек для сохранения" });
            }

            dataToUpdate.settings = JSON.stringify(settingsToSave);
        }
        
        if (Object.keys(dataToUpdate).length === 0) return res.status(400).json({ error: "Нет данных для обновления" });
        const updated = await prisma.installedPlugin.update({ where: { id: pluginId }, data: dataToUpdate });
        res.json(updated);
    } catch (error) { 
        console.error("[API Error] /plugins/:pluginId PUT:", error);
        res.status(500).json({ error: 'Не удалось обновить плагин' }); 
    }
});

router.get('/:botId/management-data', authenticate, checkBotAccess, authorize('management:view'), async (req, res) => {
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

router.get('/:id/settings/all', authenticate, checkBotAccess, authorize('bot:update'), async (req, res) => {
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

            const mergedSettings = deepMergeSettings(defaultSettings, savedSettings);
            
            // Определяем, использует ли плагин группированные настройки
            const firstSettingValue = Object.values(manifest.settings || {})[0];
            const isGroupedSettings = firstSettingValue && typeof firstSettingValue === 'object' && !firstSettingValue.type && firstSettingValue.label;
            
            // Фильтруем секретные значения
            const filteredSettings = filterSecretSettings(mergedSettings, manifest.settings, isGroupedSettings);
            
            return {
                id: plugin.id,
                name: plugin.name,
                description: plugin.description,
                isEnabled: plugin.isEnabled,
                manifest: manifest,
                settings: filteredSettings
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

router.get('/:botId/visual-editor/nodes', authenticate, checkBotAccess, authorize('management:view'), (req, res) => {
    try {
        const { graphType } = req.query;
        const nodesByCategory = nodeRegistry.getNodesByCategory(graphType);
        res.json(nodesByCategory);
    } catch (error) {
        console.error('[API Error] /visual-editor/nodes GET:', error);
        res.status(500).json({ error: 'Failed to get available nodes' });
    }
});

router.get('/:botId/visual-editor/node-config', authenticate, checkBotAccess, authorize('management:view'), (req, res) => {
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

router.get('/:botId/visual-editor/permissions', authenticate, checkBotAccess, authorize('management:view'), async (req, res) => {
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
        const { name, description, graphJson, variables, eventType, isEnabled = true } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Имя графа обязательно и должно быть непустой строкой' });
        }

        let graphJsonString;
        if (graphJson) {
            if (typeof graphJson === 'string') {
                graphJsonString = graphJson;
            } else {
                graphJsonString = JSON.stringify(graphJson);
            }
        } else {
            graphJsonString = JSON.stringify({
                nodes: [],
                connections: []
            });
        }

        console.log('[API] Final graphJsonString:', graphJsonString);

        let eventTypes = [];
        try {
            const parsedGraph = JSON.parse(graphJsonString);
            if (parsedGraph.nodes && Array.isArray(parsedGraph.nodes)) {
                const eventNodes = parsedGraph.nodes.filter(node => node.type && node.type.startsWith('event:'));
                eventTypes = [...new Set(eventNodes.map(node => node.type.split(':')[1]))];
            }
        } catch (error) {
            console.warn('[API] Не удалось извлечь типы событий из графа:', error.message);
        }

        const newEventGraph = await prisma.eventGraph.create({
            data: {
                botId,
                name: name.trim(),
                description: description || '',
                isEnabled: isEnabled,
                graphJson: graphJsonString,
                variables: variables || '[]',
                eventType: eventType || 'custom',
                triggers: {
                    create: eventTypes.map(eventType => ({ eventType }))
                }
            },
            include: { triggers: true }
        });

        console.log('[API] Created event graph:', newEventGraph);
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


router.get('/:botId/export', authenticate, checkBotAccess, authorize('bot:export'), async (req, res) => {
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

            try {
                const installedPlugins = await prisma.installedPlugin.findMany({ where: { botId } });
                const pluginSettings = installedPlugins
                    .filter(plugin => plugin.settings && plugin.settings !== '{}')
                    .map(plugin => ({
                        pluginName: plugin.name,
                        settings: plugin.settings
                    }));
                
                if (pluginSettings.length > 0) {
                    console.log(`[Export] Экспорт настроек плагинов для бота ${botId}: ${pluginSettings.length} настроек`);
                    archive.append(JSON.stringify(pluginSettings, null, 2), { name: 'settings.json' });
                } else {
                    console.log(`[Export] Нет настроек плагинов для экспорта`);
                }
            } catch (error) {
                console.warn(`[Export] Ошибка при экспорте настроек плагинов:`, error.message);
            }

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
        if (!res.headersSent) {
            res.status(500).json({ error: `Failed to export bot: ${error.message}` });
        }
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
                
                try {
                    await pluginManager._installDependencies(newPluginPath);
                } catch (e) {
                    console.warn(`[Import] Не удалось установить зависимости для плагина ${pluginName}: ${e.message}`);
                }
                
                let newPlugin;
                try {
                    newPlugin = await pluginManager.registerPlugin(newBot.id, newPluginPath, 'LOCAL', newPluginPath);
                } catch (e) {
                    newPlugin = await prisma.installedPlugin.create({ data: pluginData });
                }
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

router.post('/import/preview', authorize('bot:create'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        const tempDir = path.join(os.tmpdir(), `import-${Date.now()}`);
        await fse.ensureDir(tempDir);

        try {
            const zip = new AdmZip(req.file.buffer);
            zip.extractAllTo(tempDir, true);

            console.log('[Import] Файлы в архиве:', zip.getEntries().map(entry => entry.entryName));

            const importData = {
                plugins: [],
                commands: [],
                eventGraphs: [],
                settings: null,
                bot: null
            };

            const botConfigPath = path.join(tempDir, 'bot.json');
            if (await fse.pathExists(botConfigPath)) {
                console.log('[Import] Найден bot.json');
                const botConfig = JSON.parse(await fse.readFile(botConfigPath, 'utf8'));
                delete botConfig.password;
                delete botConfig.proxyPassword;
                delete botConfig.id;
                delete botConfig.createdAt;
                delete botConfig.updatedAt;
                importData.bot = botConfig;
            } else {
                console.log('[Import] bot.json не найден');
            }

            const pluginsPath = path.join(tempDir, 'plugins.json');
            if (await fse.pathExists(pluginsPath)) {
                console.log('[Import] Найден plugins.json');
                importData.plugins = JSON.parse(await fse.readFile(pluginsPath, 'utf8'));
                console.log('[Import] Плагинов:', importData.plugins.length);
            } else {
                console.log('[Import] plugins.json не найден');
            }

            const commandsPath = path.join(tempDir, 'commands.json');
            if (await fse.pathExists(commandsPath)) {
                console.log('[Import] Найден commands.json');
                importData.commands = JSON.parse(await fse.readFile(commandsPath, 'utf8'));
                console.log('[Import] Команд:', importData.commands.length);
            } else {
                console.log('[Import] commands.json не найден');
            }

            const eventGraphsPath = path.join(tempDir, 'event_graphs.json');
            if (await fse.pathExists(eventGraphsPath)) {
                console.log('[Import] Найден event_graphs.json');
                importData.eventGraphs = JSON.parse(await fse.readFile(eventGraphsPath, 'utf8'));
                console.log('[Import] Графов событий:', importData.eventGraphs.length);
            } else {
                console.log('[Import] event_graphs.json не найден');
                const eventGraphsPathAlt = path.join(tempDir, 'event-graphs.json');
                if (await fse.pathExists(eventGraphsPathAlt)) {
                    console.log('[Import] Найден event-graphs.json');
                    importData.eventGraphs = JSON.parse(await fse.readFile(eventGraphsPathAlt, 'utf8'));
                    console.log('[Import] Графов событий:', importData.eventGraphs.length);
                } else {
                    console.log('[Import] event-graphs.json тоже не найден');
                }
            }

            const settingsPath = path.join(tempDir, 'settings.json');
            if (await fse.pathExists(settingsPath)) {
                console.log('[Import] Найден settings.json');
                importData.settings = JSON.parse(await fse.readFile(settingsPath, 'utf8'));
            } else {
                console.log('[Import] settings.json не найден');
            }

            console.log('[Import] Итоговые данные:', {
                plugins: importData.plugins.length,
                commands: importData.commands.length,
                eventGraphs: importData.eventGraphs.length,
                hasSettings: !!importData.settings,
                hasBot: !!importData.bot
            });

            res.json(importData);

        } finally {
            await fse.remove(tempDir);
        }

    } catch (error) {
        console.error('[API Error] /bots/import/preview:', error);
        res.status(500).json({ error: 'Не удалось обработать архив импорта' });
    }
});

router.post('/import/create', authorize('bot:create'), async (req, res) => {
    try {
        const { username, password, prefix, serverId, note, owners, proxyHost, proxyPort, proxyUsername, proxyPassword, importData } = req.body;
        
        if (!username || !serverId) {
            return res.status(400).json({ error: 'Имя и сервер обязательны' });
        }

        const botData = { 
            username, 
            prefix, 
            note, 
            serverId: parseInt(serverId, 10),
            password: password ? encrypt(password) : null,
            owners: owners || '',
            proxyHost: proxyHost || null,
            proxyPort: proxyPort ? parseInt(proxyPort, 10) : null,
            proxyUsername: proxyUsername || null,
            proxyPassword: proxyPassword ? encrypt(proxyPassword) : null
        };

        const newBot = await prisma.bot.create({
            data: botData,
            include: { server: true }
        });

        await setupDefaultPermissionsForBot(newBot.id);

        if (importData) {
            try {
                if (importData.plugins && Array.isArray(importData.plugins)) {
                    for (const plugin of importData.plugins) {
                        try {
                            await prisma.installedPlugin.create({
                                data: {
                                    ...plugin,
                                    botId: newBot.id,
                                    id: undefined
                                }
                            });
                            console.log(`[Import] Импортирован плагин ${plugin.name}`);
                        } catch (error) {
                            console.warn(`[Import] Не удалось импортировать плагин ${plugin.name}:`, error.message);
                        }
                    }
                }

                if (importData.commands && Array.isArray(importData.commands)) {
                    for (const command of importData.commands) {
                        try {
                            await prisma.command.create({
                                data: {
                                    ...command,
                                    botId: newBot.id,
                                    id: undefined
                                }
                            });
                        } catch (error) {
                            console.warn(`[Import] Не удалось импортировать команду ${command.name}:`, error.message);
                        }
                    }
                }

                if (importData.eventGraphs && Array.isArray(importData.eventGraphs)) {
                    for (const graph of importData.eventGraphs) {
                        try {
                            await prisma.eventGraph.create({
                                data: {
                                    ...graph,
                                    botId: newBot.id,
                                    id: undefined
                                }
                            });
                        } catch (error) {
                            console.warn(`[Import] Не удалось импортировать граф событий ${graph.name}:`, error.message);
                        }
                    }
                }

                if (importData.settings && Array.isArray(importData.settings)) {
                    for (const setting of importData.settings) {
                        try {
                            const updated = await prisma.installedPlugin.updateMany({
                                where: {
                                    botId: newBot.id,
                                    name: setting.pluginName
                                },
                                data: {
                                    settings: setting.settings
                                }
                            });
                            if (updated.count > 0) {
                                console.log(`[Import] Импортированы настройки плагина ${setting.pluginName}`);
                            } else {
                                console.warn(`[Import] Плагин ${setting.pluginName} не найден для применения настроек`);
                            }
                        } catch (error) {
                            console.warn(`[Import] Не удалось импортировать настройки плагина ${setting.pluginName}:`, error.message);
                        }
                    }
                }

            } catch (error) {
                console.error('[Import] Ошибка при импорте данных:', error);
            }
        }

        res.status(201).json(newBot);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Бот с таким именем уже существует' });
        }
        console.error("[API Error] /bots/import/create:", error);
        res.status(500).json({ error: 'Не удалось создать бота с импортированными данными' });
    }
});

module.exports = router;
