const { LRUCache } = require('lru-cache');

class CacheManager {
    constructor() {
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
}

module.exports = CacheManager;
