const Command = require('../system/Command');

class WhoisCommand extends Command {
    constructor() {
        super({
            name: 'whois',
            description: 'Показывает информацию о пользователе',
            aliases: ['userinfo', 'кто'],
            cooldown: 5,
            permissions: 'user.whois',
            owner: 'system',
            allowedChatTypes: ['chat', 'local', 'clan', 'private', 'websocket'],
            args: [
                {
                    name: 'username',
                    type: 'string',
                    required: false,
                    description: 'Имя пользователя (по умолчанию - вы)'
                }
            ]
        });
    }

    async handler(context) {
        const targetUsername = context.args.username || context.user.username;

        try {
            const targetUser = await context.getUser(targetUsername);

            // Получаем список групп
            const groups = targetUser.groups
                .map(ug => ug.group.name)
                .join(', ') || 'Нет групп';

            // Статус
            const status = targetUser.isBlacklisted ? '⛔ В черном списке' : '✅ Активен';

            // Форматируем вывод в зависимости от транспорта
            let message;

            if (context.isWebSocket()) {
                // Для WebSocket API возвращаем структурированные данные
                message = {
                    username: targetUser.username,
                    isOwner: targetUser.isOwner,
                    isBlacklisted: targetUser.isBlacklisted,
                    groups: targetUser.groups.map(ug => ug.group.name),
                    status: status
                };
            } else {
                message = `${targetUser.username} | Группы: ${groups} | ${status}`;
            }

            return context.reply(message);

        } catch (error) {
            const errorMsg = `❌ Ошибка: ${error.message}`;
            return context.reply(errorMsg);
        }
    }
}

module.exports = WhoisCommand;
