const Transport = require('./Transport');
const UserService = require('../UserService');

/**
 * CommandContext - контекст выполнения команды
 * Предоставляет единый интерфейс для команд независимо от источника (Minecraft, WebSocket, Telegram)
 */
class CommandContext {
    /**
     * @param {object} bot - Экземпляр бота
     * @param {object} user - User объект с методами
     * @param {object} args - Аргументы команды
     * @param {Transport} transport - Transport объект
     */
    constructor(bot, user, args, transport) {
        this.bot = bot;
        this.user = user;
        this.args = args;
        this.transport = transport;

        // Для обратной совместимости
        this.typeChat = transport.type;
    }

    /**
     * Отправить ответ пользователю
     * @param {string} message - Текст сообщения
     * @returns {string|void} - Для websocket возвращает message, для остальных void
     */
    reply(message) {
        return this.transport.send(message, this.user.username);
    }

    /**
     * Отправить сообщение в определенный чат
     * @param {string} chatType - Тип чата ('chat', 'clan', 'private', etc)
     * @param {string} message - Текст сообщения
     * @param {string} recipient - Получатель (для private)
     */
    sendTo(chatType, message, recipient = null) {
        if (this.bot.api) {
            this.bot.api.sendMessage(chatType, message, recipient);
        }
    }

    /**
     * Получить User объект с методами
     * @param {string} username - Имя пользователя
     * @returns {Promise<User>} - User объект с методами
     */
    async getUser(username) {
        return await UserService.getUser(username, this.bot.config.id, this.bot.config);
    }

    /**
     * Проверка, выполняется ли команда через WebSocket API
     */
    isWebSocket() {
        return this.transport.type === 'websocket';
    }

    /**
     * Проверка, выполняется ли команда из Minecraft
     */
    isMinecraft() {
        return this.transport.isMinecraftTransport();
    }

    /**
     * Получить название транспорта
     */
    getTransportName() {
        return this.transport.getDisplayName();
    }
}

module.exports = CommandContext;
