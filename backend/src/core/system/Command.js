class Command {
    constructor({
        name,
        description = '',
        aliases = [],
        owner = 'system',
        permissions = '',
        args = [],
        cooldown = 0,
        allowedChatTypes = ['chat', 'private'],
    }) {
        this.name = name;
        this.description = description;
        this.aliases = aliases;
        this.owner = owner;
        this.permissions = permissions;
        this.args = args;
        this.cooldown = cooldown;
        this.allowedChatTypes = allowedChatTypes;
    }

    onInvalidArguments(bot, typeChat, user, error) {
        bot.api.sendMessage(typeChat, `Ошибка: ${error.message}`, user.username);
        
        const usage = this.args.map(arg => {
            const part = arg.required ? `<${arg.description}>` : `[${arg.description}]`;
            return part;
        }).join(' ');

        bot.api.sendMessage(typeChat, `Использование: ${bot.config.prefix}${this.name} ${usage}`, user.username);
    }

    onInsufficientPermissions(bot, typeChat, user) {
        bot.api.sendMessage(typeChat, `У вас нет прав для выполнения команды ${this.name}.`, user.username);
    }

    onWrongChatType(bot, typeChat, user) {
        bot.api.sendMessage('private', `Команду ${this.name} нельзя использовать в этом типе чата - ${typeChat}.`, user.username);
    }
    
    onCooldown(bot, typeChat, user, timeLeft) {
        bot.api.sendMessage(typeChat, `Команду ${this.name} можно будет использовать через ${timeLeft} сек.`, user.username);
    }

    onBlacklisted(bot, typeChat, user) {
    }

    async handler(bot, typeChat, user, args) {
        throw new Error(`Handler не реализован для команды ${this.name}`);
    }
}

module.exports = Command;