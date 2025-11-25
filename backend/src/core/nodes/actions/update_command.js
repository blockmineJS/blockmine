const prismaService = require('../../PrismaService');
const prisma = prismaService.getClient();

/**
 * Обновляет существующую команду
 * @param {object} node - Экземпляр узла из графа
 * @param {object} context - Контекст выполнения графа
 * @param {object} helpers - Вспомогательные функции движка
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse, memo } = helpers;
    const { botId, botManager } = context;

    try {
        const commandName = await resolvePinValue(node, 'commandName');
        const newName = await resolvePinValue(node, 'newName', null);
        const description = await resolvePinValue(node, 'description', null);
        let aliases = await resolvePinValue(node, 'aliases', null);
        const cooldown = await resolvePinValue(node, 'cooldown', null);
        let allowedChatTypes = await resolvePinValue(node, 'allowedChatTypes', null);
        const permissionName = await resolvePinValue(node, 'permissionName', null);

        if (aliases !== null && typeof aliases === 'string') {
            try {
                const normalizedString = aliases.replace(/'/g, '"');
                aliases = JSON.parse(normalizedString);
            } catch (e) {
                console.warn('[update_command] Не удалось распарсить aliases:', e);
                aliases = null; 
            }
        }

        if (allowedChatTypes !== null && typeof allowedChatTypes === 'string') {
            try {
                const normalizedString = allowedChatTypes.replace(/'/g, '"');
                allowedChatTypes = JSON.parse(normalizedString);
            } catch (e) {
                console.warn('[update_command] Не удалось распарсить allowedChatTypes:', e);
                allowedChatTypes = null; 
            }
        }

        if (!commandName) {
            console.error('[update_command] Имя команды обязательно');
            memo.set(`${node.id}:success`, false);
            await traverse(node, 'exec');
            return;
        }

        const existingCommand = await prisma.command.findFirst({
            where: { name: commandName, botId }
        });

        if (!existingCommand) {
            console.error(`[update_command] Команда "${commandName}" не найдена`);
            memo.set(`${node.id}:success`, false);
            await traverse(node, 'exec');
            return;
        }

        if (newName && newName !== existingCommand.name) {
            const duplicateCommand = await prisma.command.findFirst({
                where: {
                    botId,
                    name: newName,
                    id: { not: existingCommand.id }
                }
            });

            if (duplicateCommand) {
                console.error(`[update_command] Команда с именем "${newName}" уже существует`);
                memo.set(`${node.id}:success`, false);
                await traverse(node, 'exec');
                return;
            }
        }

        const updateData = {};

        if (newName !== null) updateData.name = newName;
        if (description !== null) updateData.description = description;
        if (aliases !== null) {
            updateData.aliases = JSON.stringify(Array.isArray(aliases) ? aliases : []);
        }
        if (cooldown !== null) updateData.cooldown = cooldown;
        if (allowedChatTypes !== null) {
            updateData.allowedChatTypes = JSON.stringify(
                Array.isArray(allowedChatTypes) ? allowedChatTypes : ['chat', 'private']
            );
        }

        if (permissionName !== null) {
            if (permissionName === '') {
                updateData.permissionId = null;
            } else {
                const permission = await prisma.permission.findFirst({
                    where: {
                        botId,
                        name: permissionName
                    }
                });

                if (permission) {
                    updateData.permissionId = permission.id;
                } else {
                    console.warn(`[update_command] Право "${permissionName}" не найдено, поле не будет обновлено`);
                }
            }
        }

        await prisma.command.update({
            where: { id: existingCommand.id },
            data: updateData
        });

        console.log(`[update_command] Команда "${commandName}" успешно обновлена`);

        if (botManager && botManager.reloadBotConfigInRealTime) {
            botManager.reloadBotConfigInRealTime(botId);
        }

        memo.set(`${node.id}:success`, true);
    } catch (error) {
        console.error('[update_command] Ошибка обновления команды:', error);
        memo.set(`${node.id}:success`, false);
    }

    await traverse(node, 'exec');
}

module.exports = {
    execute,
};
