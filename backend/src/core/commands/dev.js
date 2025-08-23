
const Command = require('../system/Command');
const fs = require('fs/promises');
const path = require('path');

let appVersion = null;

class DevCommand extends Command {
    constructor() {
        super({
            name: 'dev',
            description: 'Показывает информацию о панели управления и статистику бота.',
            aliases: ['about', 'version', 'ver'],
            cooldown: 10,
            permissions: 'user.say',
            owner: 'system',
            allowedChatTypes: ['chat', 'local', 'clan', 'private'],
            args: []
        });
    }

    // Переопределяем метод для кастомного сообщения при отсутствии прав
    onInsufficientPermissions(bot, typeChat, user) {
        bot.api.sendMessage(typeChat, `${user.username}, у вас нет прав для этой команды.`, user.username);
    }

    // Переопределяем метод для неправильного типа чата
    onWrongChatType(bot, typeChat, user) {
        bot.api.sendMessage('private', `${user.username}, команду dev нельзя использовать в чате типа "${typeChat}"`, user.username);
    }

    // Переопределяем метод для кулдауна
    onCooldown(bot, typeChat, user, timeLeft) {
        bot.api.sendMessage(typeChat, `${user.username}, подождите еще ${timeLeft} секунд перед повторным использованием команды.`, user.username);
    }

    // Переопределяем метод для черного списка (по умолчанию ничего не отправляется)
    onBlacklisted(bot, typeChat, user) {
        bot.api.sendMessage(typeChat, `${user.username}, вы находитесь в черном списке.`, user.username);
    }

    async handler(bot, typeChat, user) {
        if (!appVersion) {
            try {
                const packageJsonPath = path.join(__dirname, '..', '..', '..', '..', 'package.json');
                const packageJsonData = await fs.readFile(packageJsonPath, 'utf-8');
                appVersion = JSON.parse(packageJsonData).version;
            } catch (error) {
                bot.sendLog(`[DevCommand] Не удалось прочитать версию: ${error.message}`);
                appVersion = 'неизвестно';
            }
        }

        const enabledPluginsCount = bot.config.plugins.length;
        
        const uniqueCommands = new Set();
        for (const command of bot.commands.values()) {
            uniqueCommands.add(command.name);
        }
        const totalCommandsCount = uniqueCommands.size;

        bot.api.sendMessage(typeChat, `Бот создан с помощью - BlockMine. Версия: v${appVersion}. Активных плагинов: ${enabledPluginsCount}. Всего команд: ${totalCommandsCount}`, user.username);
    }
}

module.exports = DevCommand;