const prismaService = require('../../PrismaService');
const prisma = prismaService.getClient();
const { getRuntimeCommandRegistry } = require('../../system/RuntimeCommandRegistry');

/**
 * Удаляет существующую команду
 * @param {object} node - Экземпляр узла из графа
 * @param {object} context - Контекст выполнения графа
 * @param {object} helpers - Вспомогательные функции движка
 */
async function execute(node, context, helpers) {
    const { resolvePinValue, traverse, memo } = helpers;
    const { botId, botManager } = context;

    try {
        const commandName = await resolvePinValue(node, 'commandName');

        if (!commandName) {
            console.error('[delete_command] Имя команды обязательно');
            memo.set(`${node.id}:success`, false);
            await traverse(node, 'exec');
            return;
        }

        const runtimeRegistry = getRuntimeCommandRegistry();

        if (runtimeRegistry.has(botId, commandName)) {
            const tempCommand = runtimeRegistry.get(botId, commandName);
            const aliases = tempCommand && tempCommand.aliases ? tempCommand.aliases : [];

            runtimeRegistry.unregister(botId, commandName);

            if (Array.isArray(aliases)) {
                for (const alias of aliases) {
                    runtimeRegistry.unregister(botId, alias);
                }
            }

            if (botManager && botManager.processManager) {
                botManager.processManager.sendMessage(botId, {
                    type: 'unregister_temp_command',
                    commandName,
                    aliases
                });
            }

            console.log(`[delete_command] Временная команда "${commandName}" успешно удалена`);
            memo.set(`${node.id}:success`, true);
            await traverse(node, 'exec');
            return;
        }

        const existingCommand = await prisma.command.findFirst({
            where: { name: commandName, botId }
        });

        if (!existingCommand) {
            console.error(`[delete_command] Команда "${commandName}" не найдена`);
            memo.set(`${node.id}:success`, false);
            await traverse(node, 'exec');
            return;
        }

        if (!existingCommand.isVisual) {
            console.error(`[delete_command] Команда "${commandName}" является системной и не может быть удалена`);
            memo.set(`${node.id}:success`, false);
            await traverse(node, 'exec');
            return;
        }

        await prisma.command.delete({
            where: { id: existingCommand.id }
        });

        console.log(`[delete_command] Команда "${commandName}" успешно удалена`);

        if (botManager && botManager.reloadBotConfigInRealTime) {
            botManager.reloadBotConfigInRealTime(botId);
        }

        memo.set(`${node.id}:success`, true);
    } catch (error) {
        console.error('[delete_command] Ошибка удаления команды:', error);
        memo.set(`${node.id}:success`, false);
    }

    await traverse(node, 'exec');
}

module.exports = {
    execute,
};
