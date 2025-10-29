const Command = require('../system/Command');

class PingCommand extends Command {
    constructor() {
        super({
            name: 'ping',
            description: 'Проверяет работоспособность бота и может пинговать игрока.',
            aliases: ['пинг', 'p'],
            cooldown: 5,
            permissions: 'user.ping',
            owner: 'system',
            allowedChatTypes: ['local', 'clan', 'private', 'websocket'],
            
            args: [
                {
                    name: 'target',
                    type: 'string',
                    required: false,
                    description: 'Ник игрока для пинга'
                }
            ]
        });
    }

    async handler(bot, typeChat, user, { target }) {
        let message;
        if (target) {
            message = `Понг, ${user.username}! Пингую игрока ${target}.`;
        } else {
            message = `Понг, ${user.username}!`;
        }

        if (typeChat === 'websocket') {
            return message;
        }

        bot.sendMessage(typeChat, message, user.username);
    }
}

module.exports = PingCommand;