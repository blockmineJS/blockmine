const { v4: uuidv4 } = require('uuid');
const UserService = require('../UserService');
const { getRuntimeCommandRegistry } = require('../system/RuntimeCommandRegistry');
const botHistoryStore = require('../BotHistoryStore');

// Кулдауны и предупреждения - глобальные для всех инстансов
const cooldowns = new Map();
const warningCache = new Map();
const WARNING_COOLDOWN = 10 * 1000;

class CommandExecutionService {
    constructor({
        botProcessManager,
        cacheManager,
        eventGraphManager,
        commandRepository,
        permissionRepository,
        groupRepository,
        logger
    }) {
        this.processManager = botProcessManager;
        this.cache = cacheManager;
        this.eventGraphManager = eventGraphManager;
        this.commandRepository = commandRepository;
        this.permissionRepository = permissionRepository;
        this.groupRepository = groupRepository;
        this.logger = logger;
    }

    async handleCommandValidation(botConfig, message) {
        const { commandName, username, args, typeChat } = message;
        const botId = botConfig.id;

        try {
            // Получаем конфигурацию из кеша или загружаем из БД
            const botConfigCache = await this.cache.getOrLoadBotConfig(botId);

            const user = await UserService.getUser(username, botId, botConfig);

            const child = this.processManager.getProcess(botId);
            if (!child) return;

            if (user.isBlacklisted) {
                child.send({
                    type: 'handle_blacklist',
                    commandName,
                    username,
                    typeChat
                });
                return;
            }

            const mainCommandName = botConfigCache.commandAliases.get(commandName) || commandName;
            let dbCommand = botConfigCache.commands.get(mainCommandName);

            // Если команда не найдена в БД, проверяем runtime registry (временные команды)
            if (!dbCommand) {
                const runtimeRegistry = getRuntimeCommandRegistry();
                const tempCommand = runtimeRegistry.get(botId, mainCommandName);

                if (tempCommand) {
                    // Преобразуем временную команду в формат dbCommand
                    dbCommand = {
                        name: tempCommand.name,
                        isEnabled: true,
                        allowedChatTypes: JSON.stringify(tempCommand.allowedChatTypes || ['chat', 'private']),
                        permissionId: tempCommand.permissionId || null,
                        cooldown: tempCommand.cooldown || 0,
                        isTemporary: true
                    };
                }
            }

            if (!dbCommand || (!dbCommand.isEnabled && !user.isOwner)) {
                return;
            }

            const allowedTypes = JSON.parse(dbCommand.allowedChatTypes || '[]');
            if (!allowedTypes.includes(typeChat) && !user.isOwner) {
                if (typeChat === 'global') return;
                child.send({
                    type: 'handle_wrong_chat',
                    commandName: dbCommand.name,
                    username,
                    typeChat
                });
                return;
            }

            const permission = dbCommand.permissionId ? botConfigCache.permissionsById.get(dbCommand.permissionId) : null;
            if (permission && !user.hasPermission(permission.name) && !user.isOwner) {
                child.send({
                    type: 'handle_permission_error',
                    commandName: dbCommand.name,
                    username,
                    typeChat
                });
                return;
            }

            const domain = (permission?.name || '').split('.')[0] || 'user';
            const bypassCooldownPermission = `${domain}.cooldown.bypass`;

            if (dbCommand.cooldown > 0 && !user.isOwner && !user.hasPermission(bypassCooldownPermission)) {
                const cooldownKey = `${botId}:${dbCommand.name}:${user.id}`;
                const now = Date.now();
                const lastUsed = cooldowns.get(cooldownKey);

                if (lastUsed && (now - lastUsed < dbCommand.cooldown * 1000)) {
                    const timeLeft = Math.ceil((dbCommand.cooldown * 1000 - (now - lastUsed)) / 1000);
                    child.send({
                        type: 'handle_cooldown',
                        commandName: dbCommand.name,
                        username,
                        typeChat,
                        timeLeft
                    });
                    return;
                }
                cooldowns.set(cooldownKey, now);
            }

            if (this.eventGraphManager) {
                this.eventGraphManager.handleEvent(botId, 'command', {
                    commandName: dbCommand.name,
                    user: { username },
                    args,
                    typeChat
                });
            }

            child.send({ type: 'execute_handler', commandName: dbCommand.name, username, args, typeChat });

        } catch (error) {
            this.logger.error({ botId, command: commandName, username, error }, 'Ошибка валидации команды');
            this.sendMessageToBot(botId, `Произошла внутренняя ошибка при выполнении команды.`, 'private', username);
        }
    }

    async validateAndExecuteCommandForApi(botId, username, commandName, args) {
        const botConfig = this.processManager.getProcess(botId)?.botConfig;
        if (!botConfig) {
            throw new Error('Bot configuration not found.');
        }

        const typeChat = 'websocket';

        let botConfigCache = this.cache.getBotConfig(botId);
        if (!botConfigCache) {
            throw new Error('Bot configuration cache not loaded.');
        }

        const user = await UserService.getUser(username, botId, botConfig);

        if (user.isBlacklisted) {
            throw new Error(`User '${username}' is blacklisted.`);
        }

        const mainCommandName = botConfigCache.commandAliases.get(commandName) || commandName;
        let dbCommand = botConfigCache.commands.get(mainCommandName);

        // Если команда не найдена в БД, проверяем runtime registry (временные команды)
        if (!dbCommand) {
            const runtimeRegistry = getRuntimeCommandRegistry();
            const tempCommand = runtimeRegistry.get(botId, mainCommandName);

            if (tempCommand) {
                // Преобразуем временную команду в формат dbCommand
                dbCommand = {
                    name: tempCommand.name,
                    isEnabled: true,
                    allowedChatTypes: JSON.stringify(tempCommand.allowedChatTypes || ['chat', 'private']),
                    permissionId: tempCommand.permissionId || null,
                    cooldown: tempCommand.cooldown || 0,
                    isTemporary: true
                };
            }
        }

        if (!dbCommand || (!dbCommand.isEnabled && !user.isOwner)) {
            throw new Error(`Command '${commandName}' not found or is disabled.`);
        }

        // WebSocket - универсальный транспорт
        if (typeChat !== 'websocket') {
            const allowedTypes = JSON.parse(dbCommand.allowedChatTypes || '[]');
            if (!allowedTypes.includes(typeChat) && !user.isOwner) {
                throw new Error(`Command '${commandName}' cannot be used in this chat type.`);
            }
        }

        const permission = dbCommand.permissionId ? botConfigCache.permissionsById.get(dbCommand.permissionId) : null;
        if (permission && !user.hasPermission(permission.name) && !user.isOwner) {
            throw new Error(`User '${username}' has insufficient permissions.`);
        }

        const domain = (permission?.name || '').split('.')[0] || 'user';
        const bypassCooldownPermission = `${domain}.cooldown.bypass`;

        if (dbCommand.cooldown > 0 && !user.isOwner && !user.hasPermission(bypassCooldownPermission)) {
            const cooldownKey = `${botId}:${dbCommand.name}:${user.id}`;
            const now = Date.now();
            const lastUsed = cooldowns.get(cooldownKey);

            if (lastUsed && (now - lastUsed < dbCommand.cooldown * 1000)) {
                const timeLeft = Math.ceil((dbCommand.cooldown * 1000 - (now - lastUsed)) / 1000);
                throw new Error(`Command on cooldown for user '${username}'. Please wait ${timeLeft} seconds.`);
            }
            cooldowns.set(cooldownKey, now);
        }

        return this._executeCommandInProcess(botId, dbCommand.name, args, user, typeChat);
    }

    async _executeCommandInProcess(botId, commandName, args, user, typeChat) {
        return new Promise((resolve, reject) => {
            const child = this.processManager.getProcess(botId);
            if (!child || child.killed) {
                return reject(new Error('Bot is not running'));
            }

            const requestId = uuidv4();

            // Таймаут на выполнение команды
            const timeout = setTimeout(() => {
                reject(new Error('Command execution timed out.'));
            }, 10000);

            this.processManager.addCommandRequest(requestId, {
                resolve: (result) => {
                    clearTimeout(timeout);

                    botHistoryStore.addCommandLog(botId, {
                        username: user.username,
                        command: commandName,
                        args: args || {},
                        success: true
                    });

                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);

                    botHistoryStore.addCommandLog(botId, {
                        username: user.username,
                        command: commandName,
                        args: args || {},
                        success: false,
                        error: error.message || String(error)
                    });

                    reject(error);
                }
            });

            child.send({
                type: 'execute_command_request',
                requestId,
                payload: {
                    commandName,
                    args: args || {},
                    username: user.username,
                    typeChat
                }
            });
        });
    }

    sendMessageToBot(botId, message, chatType = 'command', username = null) {
        const child = this.processManager.getProcess(botId);
        if (child && child.api) {
            child.api.sendMessage(chatType, message, username);
            return { success: true };
        }
        return { success: false, message: 'Бот не найден или не запущен' };
    }

    async handleCommandRegistration(botId, commandConfig) {
        try {
            let permissionId = null;

            if (commandConfig.permissions) {
                let permission = await this.permissionRepository.findByName(botId, commandConfig.permissions);

                if (!permission) {
                    permission = await this.permissionRepository.create({
                        botId,
                        name: commandConfig.permissions,
                        description: `Автоматически создано для команды ${commandConfig.name}`,
                        owner: commandConfig.owner,
                    });
                }
                permissionId = permission.id;
            }

            const createData = {
                botId,
                name: commandConfig.name,
                description: commandConfig.description,
                aliases: JSON.stringify(commandConfig.aliases || []),
                owner: commandConfig.owner,
                permissionId: permissionId,
                allowedChatTypes: JSON.stringify(commandConfig.allowedChatTypes || []),
                cooldown: commandConfig.cooldown || 0,
            };

            const updateData = {
                description: commandConfig.description,
                owner: commandConfig.owner,
                aliases: JSON.stringify(commandConfig.aliases || []),
                allowedChatTypes: JSON.stringify(commandConfig.allowedChatTypes || []),
                cooldown: commandConfig.cooldown || 0,
            };

            const existingCommand = await this.commandRepository.findByName(botId, commandConfig.name);
            if (existingCommand) {
                // Обновляем permissionId только если он null (не был установлен пользователем)
                if (existingCommand.permissionId === null && permissionId !== null) {
                    updateData.permissionId = permissionId;
                }
                await this.commandRepository.update(existingCommand.id, updateData);
            } else {
                await this.commandRepository.create(createData);
            }

            this.cache.deleteBotConfig(botId);
        } catch (error) {
            this.logger.error({ botId, commandName: commandConfig.name, error }, 'Ошибка регистрации команды');
        }
    }

    async handleGroupRegistration(botId, groupConfig) {
        try {
            if (!groupConfig.name || !groupConfig.owner) {
                this.logger.warn({ botId, groupConfig }, 'Пропущена группа без имени или владельца');
                return;
            }

            await this.groupRepository.upsertGroup(botId, groupConfig.name, {
                owner: groupConfig.owner,
                description: groupConfig.description || ''
            });

            this.logger.debug({ botId, groupName: groupConfig.name }, 'Группа зарегистрирована');
            this.cache.deleteBotConfig(botId);
        } catch (error) {
            this.logger.error({ botId, groupName: groupConfig.name, error }, 'Ошибка регистрации группы');
        }
    }

    async handlePermissionsRegistration(botId, permissions) {
        try {
            for (const perm of permissions) {
                if (!perm.name || !perm.owner) {
                    this.logger.warn({ botId, perm }, 'Пропущено право без имени или владельца');
                    continue;
                }

                const existing = await this.permissionRepository.findByName(botId, perm.name);
                if (existing) {
                    await this.permissionRepository.update(existing.id, { description: perm.description });
                } else {
                    await this.permissionRepository.create({
                        botId,
                        name: perm.name,
                        description: perm.description || '',
                        owner: perm.owner,
                    });
                }
            }

            this.cache.deleteBotConfig(botId);
        } catch (error) {
            this.logger.error({ botId, error }, 'Ошибка регистрации прав');
        }
    }

    async handleAddPermissionsToGroup(botId, message) {
        try {
            const { groupName, permissionNames } = message;

            // Находим группу
            const group = await this.groupRepository.findByName(botId, groupName);
            if (!group) {
                this.logger.warn({ botId, groupName }, 'Группа не найдена');
                return;
            }

            // Добавляем каждое право в группу
            for (const permName of permissionNames) {
                const permission = await this.permissionRepository.findByName(botId, permName);
                if (!permission) {
                    this.logger.warn({ botId, groupName, permName }, 'Право не найдено');
                    continue;
                }

                await this.groupRepository.addPermissionToGroup(group.id, permission.id, this.permissionRepository.prisma);
                this.logger.debug({ botId, groupName, permName }, 'Право добавлено в группу');
            }

            this.cache.deleteBotConfig(botId);
        } catch (error) {
            this.logger.error({ botId, groupName: message.groupName, error }, 'Ошибка добавления прав в группу');
        }
    }
}

module.exports = CommandExecutionService;
