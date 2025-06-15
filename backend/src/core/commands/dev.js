
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
        const totalCommandsCount = bot.commands.size;

        bot.api.sendMessage(typeChat, `Бот создан с помощью - BlockMine. Версия: v${appVersion}. Активных плагинов: ${enabledPluginsCount}. Всего команд: ${totalCommandsCount}`, user.username);
    }
}

module.exports = DevCommand;