const prismaService = require('../../PrismaService');
const prisma = prismaService.getClient();
const { getRuntimeCommandRegistry } = require('../../system/RuntimeCommandRegistry');
const Command = require('../../system/Command');

/**
 * Создает новую команду (временную или постоянную)
 * @param {object} node - Экземпляр узла из графа
 * @param {object} context - Контекст выполнения графа
 * @param {object} helpers - Вспомогательные функции движка
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse, memo } = helpers;
    const { botId, botManager } = context;

    try {
        const name = await resolvePinValue(node, 'name');
        const description = await resolvePinValue(node, 'description', '');
        let aliases = await resolvePinValue(node, 'aliases', []);
        const cooldown = await resolvePinValue(node, 'cooldown', 0);
        let allowedChatTypes = await resolvePinValue(node, 'allowedChatTypes', ['chat', 'private']);
        const permissionName = await resolvePinValue(node, 'permissionName', null);
        const temporary = await resolvePinValue(node, 'temporary', false);

        if (typeof aliases === 'string') {
            try {
                const normalizedString = aliases.replace(/'/g, '"');
                aliases = JSON.parse(normalizedString);
            } catch (e) {
                console.warn('[create_command] Не удалось распарсить aliases:', e);
                aliases = [];
            }
        }

        if (typeof allowedChatTypes === 'string') {
            try {
                const normalizedString = allowedChatTypes.replace(/'/g, '"');
                allowedChatTypes = JSON.parse(normalizedString);
            } catch (e) {
                console.warn('[create_command] Не удалось распарсить allowedChatTypes:', e);
                allowedChatTypes = ['chat', 'private'];
            }
        }

        if (!name) {
            console.error('[create_command] Имя команды обязательно');
            memo.set(`${node.id}:success`, false);
            memo.set(`${node.id}:commandId`, null);
            await traverse(node, 'exec');
            return;
        }

        let commandId = null;

        if (temporary) {
            commandId = `temp_${Date.now()}`;

            let permissionId = null;

            if (permissionName) {
                const permission = await prisma.permission.findFirst({
                    where: {
                        botId,
                        name: permissionName
                    }
                });

                if (permission) {
                    permissionId = permission.id;
                }
            }

            const tempCommand = new Command({
                name,
                description: description || '',
                aliases: Array.isArray(aliases) ? aliases : [],
                cooldown: cooldown || 0,
                allowedChatTypes: Array.isArray(allowedChatTypes) ? allowedChatTypes : ['chat', 'private'],
                args: [],
                owner: 'runtime',
            });

            tempCommand.permissionId = permissionId;
            tempCommand.isTemporary = true;
            tempCommand.tempId = commandId;
            tempCommand.isVisual = false;

            tempCommand.handler = () => {
                // Handler будет вызван через validate_and_run_command в BotProcess
            };

            // Регистрируем в runtime registry (для главного процесса)
            const runtimeRegistry = getRuntimeCommandRegistry();
            runtimeRegistry.register(botId, name, tempCommand);

            // Также регистрируем алиасы в runtime registry
            if (Array.isArray(aliases)) {
                for (const alias of aliases) {
                    runtimeRegistry.register(botId, alias, tempCommand);
                }
            }

            // Отправляем IPC сообщение в child process для регистрации команды
            if (botManager && botManager.processManager) {
                botManager.processManager.sendMessage(botId, {
                    type: 'register_temp_command',
                    commandData: {
                        name,
                        description: description || '',
                        aliases: Array.isArray(aliases) ? aliases : [],
                        cooldown: cooldown || 0,
                        allowedChatTypes: Array.isArray(allowedChatTypes) ? allowedChatTypes : ['chat', 'private'],
                        permissionId,
                        tempId: commandId,
                    }
                });
            }

            console.log(`[create_command] Временная команда "${name}" создана с ID ${commandId}`);
        } else {
            const existingCommand = await prisma.command.findFirst({
                where: { botId, name }
            });

            if (existingCommand) {
                console.error(`[create_command] Команда "${name}" уже существует`);
                memo.set(`${node.id}:success`, false);
                memo.set(`${node.id}:commandId`, null);
                await traverse(node, 'exec');
                return;
            }

            let permissionId = null;
            if (permissionName) {
                const permission = await prisma.permission.findFirst({
                    where: {
                        botId,
                        name: permissionName
                    }
                });

                if (permission) {
                    permissionId = permission.id;
                } else {
                    console.warn(`[create_command] Право "${permissionName}" не найдено, команда будет создана без права`);
                }
            }

            const newCommand = await prisma.command.create({
                data: {
                    botId,
                    name,
                    description: description || '',
                    aliases: JSON.stringify(Array.isArray(aliases) ? aliases : []),
                    permissionId: permissionId || null,
                    cooldown: cooldown || 0,
                    allowedChatTypes: JSON.stringify(Array.isArray(allowedChatTypes) ? allowedChatTypes : ['chat', 'private']),
                    isVisual: true,
                    argumentsJson: '[]',
                    graphJson: JSON.stringify({
                        nodes: [],
                        edges: []
                    }),
                    pluginOwnerId: null
                }
            });

            commandId = newCommand.id;
            console.log(`[create_command] Постоянная команда "${name}" создана с ID ${commandId}`);

            if (botManager && botManager.reloadBotConfigInRealTime) {
                botManager.reloadBotConfigInRealTime(botId);
            }
        }

        memo.set(`${node.id}:commandId`, commandId);
        memo.set(`${node.id}:success`, true);
    } catch (error) {
        console.error('[create_command] Ошибка создания команды:', error);
        memo.set(`${node.id}:success`, false);
        memo.set(`${node.id}:commandId`, null);
    }

    await traverse(node, 'exec');
}

module.exports = {
    execute,
};
