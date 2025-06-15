const fs = require('fs');
const path = require('path');
const Command = require('./Command');

class CommandManager {
    constructor(commandsPath) {
        this.commandTemplates = new Map();
        this.commandsPath = commandsPath;
        this.loadCommandTemplates();
    }

    /**
     * Сканирует директорию, загружает и кэширует "шаблоны" команд.
     * Шаблон - это конфигурация по умолчанию из файла команды.
     */
    loadCommandTemplates() {
        console.log('[CommandManager] Загрузка шаблонов команд...');
        try {
            const commandFiles = fs.readdirSync(this.commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(this.commandsPath, file);
                const CommandClass = require(filePath);
                
                if (CommandClass.prototype instanceof Command) {
                    const commandInstance = new CommandClass();
                    const config = {
                        name: commandInstance.name,
                        argsCount: commandInstance.argsCount,
                        permissions: commandInstance.permissions,
                        cooldown: commandInstance.cooldown,
                        isActive: commandInstance.isActive,
                        description: commandInstance.description || '',
                        aliases: commandInstance.aliases || [],
                        owner: commandInstance.owner || 'system',
                    };

                    if (config.name) {
                        this.commandTemplates.set(config.name, config);
                        console.log(`[CommandManager] Шаблон для команды "${config.name}" успешно загружен.`);
                    }
                }
            }
        } catch (error) {
            console.error('[CommandManager] Ошибка при загрузке шаблонов команд:', error);
        }
    }

    /**
     * Возвращает массив всех шаблонов команд.
     * @returns {Array<object>}
     */
    getCommandTemplates() {
        return Array.from(this.commandTemplates.values());
    }
}

const commandsDir = path.join(__dirname, '../commands');
module.exports = new CommandManager(commandsDir);