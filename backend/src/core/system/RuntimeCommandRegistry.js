/**
 * RuntimeCommandRegistry - реестр временных команд, созданных во время выполнения
 * Хранит команды в памяти для каждого бота
 */
class RuntimeCommandRegistry {
    constructor() {
        // Map<botId, Map<commandName, Command>>
        this.commands = new Map();
    }

    /**
     * Добавить временную команду для бота
     * @param {string} botId - ID бота
     * @param {string} commandName - Имя команды
     * @param {object} commandData - Данные команды
     */
    register(botId, commandName, commandData) {
        if (!this.commands.has(botId)) {
            this.commands.set(botId, new Map());
        }

        const botCommands = this.commands.get(botId);
        botCommands.set(commandName, commandData);
    }

    /**
     * Удалить временную команду
     * @param {string} botId - ID бота
     * @param {string} commandName - Имя команды
     * @returns {boolean} - Успешно ли удалена команда
     */
    unregister(botId, commandName) {
        if (!this.commands.has(botId)) {
            return false;
        }

        const botCommands = this.commands.get(botId);
        return botCommands.delete(commandName);
    }

    /**
     * Получить временную команду
     * @param {string} botId - ID бота
     * @param {string} commandName - Имя команды
     * @returns {object|null} - Данные команды или null
     */
    get(botId, commandName) {
        if (!this.commands.has(botId)) {
            return null;
        }

        return this.commands.get(botId).get(commandName) || null;
    }

    /**
     * Получить все временные команды для бота
     * @param {string} botId - ID бота
     * @returns {Map<string, object>} - Map команд
     */
    getAllForBot(botId) {
        return this.commands.get(botId) || new Map();
    }

    /**
     * Проверить существование команды
     * @param {string} botId - ID бота
     * @param {string} commandName - Имя команды
     * @returns {boolean}
     */
    has(botId, commandName) {
        if (!this.commands.has(botId)) {
            return false;
        }

        return this.commands.get(botId).has(commandName);
    }

    /**
     * Очистить все команды для бота (при остановке бота)
     * @param {string} botId - ID бота
     */
    clearForBot(botId) {
        if (this.commands.has(botId)) {
            this.commands.delete(botId);
        }
    }

    /**
     * Получить статистику
     * @returns {object}
     */
    getStats() {
        let totalCommands = 0;
        for (const botCommands of this.commands.values()) {
            totalCommands += botCommands.size;
        }

        return {
            totalBots: this.commands.size,
            totalCommands,
        };
    }
}


let instance = null;

module.exports = {
    RuntimeCommandRegistry,
    getRuntimeCommandRegistry: () => {
        if (!instance) {
            instance = new RuntimeCommandRegistry();
        }
        return instance;
    }
};
