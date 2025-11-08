const { LRUCache } = require('lru-cache');

class CacheManager {
    constructor({ commandRepository, permissionRepository, logger } = {}) {
        // Кеш с TTL и максимальным размером
        this.tokenCache = new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 5, // 5 минут
        });

        this.playerListCache = new LRUCache({
            max: 100,
            ttl: 1000 * 2, // 2 секунды
        });

        this.botConfigsCache = new Map();
        
        // Зависимости для автозагрузки конфигурации
        this.commandRepository = commandRepository;
        this.permissionRepository = permissionRepository;
        this.logger = logger;
    }

    // Token cache
    getToken(token) {
        return this.tokenCache.get(token);
    }

    setToken(token, data) {
        this.tokenCache.set(token, data);
    }

    deleteToken(token) {
        this.tokenCache.delete(token);
    }

    // Player list cache
    getPlayerList(botId) {
        return this.playerListCache.get(botId);
    }

    setPlayerList(botId, players) {
        this.playerListCache.set(botId, players);
    }

    // Bot config cache
    getBotConfig(botId) {
        return this.botConfigsCache.get(botId);
    }

    setBotConfig(botId, config) {
        this.botConfigsCache.set(botId, config);
    }

    deleteBotConfig(botId) {
        this.botConfigsCache.delete(botId);
    }

    // Очистка всего кеша для бота
    clearBotCache(botId) {
        this.deleteBotConfig(botId);
        this.playerListCache.delete(botId);
    }

    /**
     * Получает конфигурацию бота из кеша или загружает из БД
     * @param {number} botId - ID бота
     * @returns {Promise<object>} - Конфигурация бота
     */
    async getOrLoadBotConfig(botId) {
        let config = this.botConfigsCache.get(botId);
        
        if (!config) {
            if (this.logger) {
                this.logger.debug({ botId }, 'Кеш конфигурации отсутствует, загрузка из БД');
            }
            
            if (!this.commandRepository || !this.permissionRepository) {
                throw new Error('CacheManager не имеет доступа к репозиториям для загрузки конфигурации');
            }

            const [commands, permissions] = await Promise.all([
                this.commandRepository.findByBotId(botId),
                this.permissionRepository.findByBotId(botId),
            ]);

            config = {
                commands: new Map(commands.map(cmd => [cmd.name, cmd])),
                permissionsById: new Map(permissions.map(p => [p.id, p])),
                commandAliases: new Map()
            };

            for (const cmd of commands) {
                const aliases = JSON.parse(cmd.aliases || '[]');
                for (const alias of aliases) {
                    config.commandAliases.set(alias, cmd.name);
                }
            }

            this.botConfigsCache.set(botId, config);
            
            if (this.logger) {
                this.logger.debug({ botId }, 'Конфигурация загружена и закеширована');
            }
        }

        return config;
    }
}

module.exports = CacheManager;
