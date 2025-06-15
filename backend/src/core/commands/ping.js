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
            allowedChatTypes: ['local', 'clan', 'private'],
            
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

        if (target) {
            bot.api.sendMessage(typeChat, `Понг, ${user.username}! Пингую игрока ${target}.`, user.username);
        } else {
            bot.api.sendMessage(typeChat, `Понг, ${user.username}!`, user.username);
        }
    }
}

module.exports = PingCommand;