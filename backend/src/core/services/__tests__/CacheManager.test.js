const CacheManager = require('../CacheManager');

describe('CacheManager', () => {
    let cache;

    beforeEach(() => {
        cache = new CacheManager();
    });

    describe('getMetrics', () => {
        it('returns zero metrics on init', () => {
            const metrics = cache.getMetrics();
            expect(metrics.tokenCache).toEqual({ hits: 0, misses: 0, hitRate: 0 });
            expect(metrics.playerListCache).toEqual({ hits: 0, misses: 0, hitRate: 0 });
            expect(metrics.botConfigsCache).toEqual({ hits: 0, misses: 0, hitRate: 0 });
        });

        it('tracks tokenCache hits and misses', () => {
            cache.setToken('tok1', { user: 'alice' });
            cache.getToken('tok1');
            cache.getToken('tok-missing');

            const { tokenCache } = cache.getMetrics();
            expect(tokenCache.hits).toBe(1);
            expect(tokenCache.misses).toBe(1);
            expect(tokenCache.hitRate).toBe(0.5);
        });

        it('tracks playerListCache hits and misses', () => {
            cache.setPlayerList(1, ['player1']);
            cache.getPlayerList(1);
            cache.getPlayerList(999);

            const { playerListCache } = cache.getMetrics();
            expect(playerListCache.hits).toBe(1);
            expect(playerListCache.misses).toBe(1);
            expect(playerListCache.hitRate).toBe(0.5);
        });

        it('tracks botConfigsCache hits and misses', () => {
            cache.setBotConfig(1, { commands: new Map() });
            cache.getBotConfig(1);
            cache.getBotConfig(999);

            const { botConfigsCache } = cache.getMetrics();
            expect(botConfigsCache.hits).toBe(1);
            expect(botConfigsCache.misses).toBe(1);
            expect(botConfigsCache.hitRate).toBe(0.5);
        });

        it('computes hitRate as 1 when all are hits', () => {
            cache.setToken('t', 'v');
            cache.getToken('t');
            cache.getToken('t');

            const { tokenCache } = cache.getMetrics();
            expect(tokenCache.hitRate).toBe(1);
        });

        it('computes hitRate as 0 when all are misses', () => {
            cache.getToken('nope');
            cache.getToken('nope2');

            const { tokenCache } = cache.getMetrics();
            expect(tokenCache.hitRate).toBe(0);
            expect(tokenCache.hits).toBe(0);
            expect(tokenCache.misses).toBe(2);
        });
    });

    describe('resetMetrics', () => {
        it('resets all counters to zero', () => {
            cache.setToken('t', 'v');
            cache.getToken('t');
            cache.getToken('missing');
            cache.setPlayerList(1, []);
            cache.getPlayerList(1);

            cache.resetMetrics();

            const metrics = cache.getMetrics();
            expect(metrics.tokenCache).toEqual({ hits: 0, misses: 0, hitRate: 0 });
            expect(metrics.playerListCache).toEqual({ hits: 0, misses: 0, hitRate: 0 });
            expect(metrics.botConfigsCache).toEqual({ hits: 0, misses: 0, hitRate: 0 });
        });
    });

    describe('checkMemoryUsage', () => {
        it('returns heapUsed, threshold, and exceeded fields', () => {
            const result = cache.checkMemoryUsage();
            expect(typeof result.heapUsed).toBe('number');
            expect(typeof result.threshold).toBe('number');
            expect(typeof result.exceeded).toBe('boolean');
        });

        it('does not clear playerListCache when under threshold', () => {
            cache.memoryThreshold = Number.MAX_SAFE_INTEGER;
            cache.setPlayerList(1, ['player1']);

            const result = cache.checkMemoryUsage();

            expect(result.exceeded).toBe(false);
            expect(cache.getPlayerList(1)).toEqual(['player1']);
        });

        it('clears playerListCache when threshold is exceeded', () => {
            cache.memoryThreshold = 1;
            cache.setPlayerList(1, ['player1']);
            cache.setPlayerList(2, ['player2']);

            const result = cache.checkMemoryUsage();

            expect(result.exceeded).toBe(true);
            expect(cache.playerListCache.size).toBe(0);
        });

        it('logs a warning when threshold is exceeded', () => {
            const logger = { warn: jest.fn() };
            cache = new CacheManager({ logger });
            cache.memoryThreshold = 1;

            cache.checkMemoryUsage();

            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({ threshold: 1 }),
                expect.any(String)
            );
        });

        it('does not log when no logger is provided', () => {
            cache.memoryThreshold = 1;
            expect(() => cache.checkMemoryUsage()).not.toThrow();
        });
    });

    describe('backward compatibility', () => {
        it('getToken/setToken/deleteToken work as before', () => {
            cache.setToken('abc', { id: 1 });
            expect(cache.getToken('abc')).toEqual({ id: 1 });
            cache.deleteToken('abc');
            expect(cache.getToken('abc')).toBeUndefined();
        });

        it('getPlayerList/setPlayerList work as before', () => {
            cache.setPlayerList(42, ['a', 'b']);
            expect(cache.getPlayerList(42)).toEqual(['a', 'b']);
        });

        it('getBotConfig/setBotConfig/deleteBotConfig work as before', () => {
            cache.setBotConfig(7, { commands: new Map() });
            expect(cache.getBotConfig(7)).toBeDefined();
            cache.deleteBotConfig(7);
            expect(cache.getBotConfig(7)).toBeUndefined();
        });

        it('clearBotCache removes both playerList and botConfig', () => {
            cache.setPlayerList(5, ['x']);
            cache.setBotConfig(5, { commands: new Map() });
            cache.clearBotCache(5);
            expect(cache.getPlayerList(5)).toBeUndefined();
            expect(cache.getBotConfig(5)).toBeUndefined();
        });

        it('botConfigsCache remains a Map', () => {
            expect(cache.botConfigsCache).toBeInstanceOf(Map);
        });
    });
});
