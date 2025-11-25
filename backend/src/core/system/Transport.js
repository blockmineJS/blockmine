/**
 * Transport - абстракция для различных способов доставки сообщений
 * Поддерживает: websocket, minecraft (chat/clan/private/command), telegram (будущее)
 */
class Transport {
    constructor(type, bot = null) {
        this.type = type; // 'websocket' | 'chat' | 'clan' | 'private' | 'command' | 'telegram'
        this.bot = bot;
    }

    /**
     * Отправить сообщение через этот транспорт
     * @param {string} message - Текст сообщения
     * @param {string} recipient - Получатель (для private/telegram)
     * @returns {string|void} - Для websocket возвращает message, для остальных void
     */
    send(message, recipient = null) {
        if (this.type === 'websocket') {
            // WebSocket - возвращаем результат как есть
            return message;
        } else if (this.isMinecraftTransport()) {
            // Minecraft - отправляем через бота
            if (this.bot && this.bot.api) {
                this.bot.api.sendMessage(this.type, message, recipient);
            }
        }
    }

    /**
     * Проверка, является ли этот транспорт Minecraft-транспортом
     */
    isMinecraftTransport() {
        return ['chat', 'local', 'clan', 'private', 'command'].includes(this.type);
    }

    /**
     * Проверка, является ли этот транспорт универсальным (не требует проверки allowedChatTypes)
     */
    isUniversal() {
        return this.type === 'websocket';
    }

    /**
     * Проверка, может ли команда быть выполнена через этот транспорт
     * @param {Array<string>} allowedTypes - Список разрешенных типов чата из команды
     */
    isAllowedFor(allowedTypes) {
        // Универсальные транспорты всегда разрешены
        if (this.isUniversal()) {
            return true;
        }

        // Для остальных проверяем список разрешенных типов
        return allowedTypes.includes(this.type);
    }

    /**
     * Получить читаемое название транспорта
     */
    getDisplayName() {
        const names = {
            websocket: 'WebSocket API',
            chat: 'Общий чат',
            local: 'Локальный чат',
            clan: 'Клан',
            private: 'Личное сообщение',
            command: 'Команда',
            telegram: 'Telegram'
        };
        return names[this.type] || this.type;
    }
}

module.exports = Transport;
