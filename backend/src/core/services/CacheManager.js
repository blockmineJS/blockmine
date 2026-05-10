const { LRUCache } = require('lru-cache');

const DEFAULT_MEMORY_THRESHOLD = 500 * 1024 * 1024;

class CacheManager {
    constructor({ commandRepository, permissionRepository, logger } = {}) {
        this.tokenCache = new LRUCache({
            max: 500,
            ttl: 1000 * 60 * 5,
        });

        this.playerListCache = new LRUCache({
            max: 100,
            ttl: 1000 * 2,
        });

        this.botConfigsCache = new Map();

        this.commandRepository = commandRepository;
        this.permissionRepository = permissionRepository;
        this.logger = logger;

        this.memoryThreshold = DEFAULT_MEMORY_THRESHOLD;

        this._metrics = {
            tokenCache: { hits: 0, misses: 0 },
            playerListCache: { hits: 0, misses: 0 },
            botConfigsCache: { hits: 0, misses: 0 },
        };
    }

    getToken(token) {
        const value = this.tokenCache.get(token);
        if (value !== undefined) {
            this._metrics.tokenCache.hits++;
        } else {
            this._metrics.tokenCache.misses++;
        }
        return value;
    }

    setToken(token, data) {
        this.tokenCache.set(token, data);
    }

    deleteToken(token) {
        this.tokenCache.delete(token);
    }

    getPlayerList(botId) {
        const value = this.playerListCache.get(botId);
        if (value !== undefined) {
            this._metrics.playerListCache.hits++;
        } else {
            this._metrics.playerListCache.misses++;
        }
        return value;
    }

    setPlayerList(botId, players) {
        this.playerListCache.set(botId, players);
    }

    getBotConfig(botId) {
        const value = this.botConfigsCache.get(botId);
        if (value !== undefined) {
            this._metrics.botConfigsCache.hits++;
        } else {
            this._metrics.botConfigsCache.misses++;
        }
        return value;
    }

    setBotConfig(botId, config) {
        this.botConfigsCache.set(botId, config);
    }

    deleteBotConfig(botId) {
        this.botConfigsCache.delete(botId);
    }

    clearBotCache(botId) {
        this.deleteBotConfig(botId);
        this.playerListCache.delete(botId);
    }

    getMetrics() {
        const calc = ({ hits, misses }) => {
            const total = hits + misses;
            return {
                hits,
                misses,
                hitRate: total === 0 ? 0 : hits / total,
            };
        };

        return {
            tokenCache: calc(this._metrics.tokenCache),
            playerListCache: calc(this._metrics.playerListCache),
            botConfigsCache: calc(this._metrics.botConfigsCache),
        };
    }

    resetMetrics() {
        this._metrics = {
            tokenCache: { hits: 0, misses: 0 },
            playerListCache: { hits: 0, misses: 0 },
            botConfigsCache: { hits: 0, misses: 0 },
        };
    }

    checkMemoryUsage() {
        const { heapUsed } = process.memoryUsage();
        const threshold = this.memoryThreshold;
        const exceeded = heapUsed > threshold;

        if (exceeded) {
            if (this.logger) {
                this.logger.warn(
                    { heapUsed, threshold },
                    'Memory threshold exceeded, clearing playerListCache'
                );
            }
            this.playerListCache.clear();
        }

        return { heapUsed, threshold, exceeded };
    }

    async getOrLoadBotConfig(botId) {
        let config = this.botConfigsCache.get(botId);

        if (!config) {
            if (this.logger) {
                this.logger.debug({ botId }, 'Cache miss, loading from DB');
            }

            if (!this.commandRepository || !this.permissionRepository) {
                throw new Error('CacheManager does not have access to repositories for loading configuration');
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
                this.logger.debug({ botId }, 'Configuration loaded and cached');
            }
        }

        return config;
    }
}

module.exports = CacheManager;
