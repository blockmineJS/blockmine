const ConnectionPool = require('../ConnectionPool');
const { ExternalServiceError } = require('../../errors/index');

function makeFactory(failCreate = false) {
    let id = 0;
    return {
        create: jest.fn(async () => {
            if (failCreate) throw new Error('create failed');
            return { id: ++id };
        }),
        destroy: jest.fn(async () => {}),
    };
}

describe('ConnectionPool', () => {
    describe('acquire', () => {
        it('creates a new connection when pool is empty', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 5 });
            const conn = await pool.acquire();
            expect(conn).toBeDefined();
            expect(factory.create).toHaveBeenCalledTimes(1);
        });

        it('returns idle connection without creating a new one', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 5 });
            const conn = await pool.acquire();
            pool.release(conn);
            const conn2 = await pool.acquire();
            expect(conn2).toBe(conn);
            expect(factory.create).toHaveBeenCalledTimes(1);
        });

        it('queues request when pool is at max capacity', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 1 });
            const conn1 = await pool.acquire();
            const pending = pool.acquire();
            expect(pool.getStats().pending).toBe(1);
            pool.release(conn1);
            const conn2 = await pending;
            expect(conn2).toBe(conn1);
        });

        it('throws ExternalServiceError on timeout', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 1, acquireTimeout: 50 });
            await pool.acquire();
            await expect(pool.acquire()).rejects.toBeInstanceOf(ExternalServiceError);
        });

        it('throws ExternalServiceError when factory.create fails', async () => {
            const factory = makeFactory(true);
            const pool = new ConnectionPool({ factory, min: 0, max: 5 });
            await expect(pool.acquire()).rejects.toBeInstanceOf(ExternalServiceError);
            expect(pool.getStats().total).toBe(0);
        });
    });

    describe('release', () => {
        it('returns connection to idle pool when no queue', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 5 });
            const conn = await pool.acquire();
            pool.release(conn);
            expect(pool.getStats().idle).toBe(1);
        });

        it('passes connection directly to next queued waiter', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 1 });
            const conn = await pool.acquire();
            const waiterPromise = pool.acquire();
            pool.release(conn);
            const waiterConn = await waiterPromise;
            expect(waiterConn).toBe(conn);
            expect(pool.getStats().idle).toBe(0);
        });
    });

    describe('destroy', () => {
        it('destroys all idle connections', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 5 });
            const conn = await pool.acquire();
            pool.release(conn);
            await pool.destroy();
            expect(factory.destroy).toHaveBeenCalledWith(conn);
            expect(pool.getStats().total).toBe(0);
            expect(pool.getStats().idle).toBe(0);
        });

        it('rejects pending queue entries on destroy', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 1 });
            await pool.acquire();
            const pending = pool.acquire();
            await pool.destroy();
            await expect(pending).rejects.toBeInstanceOf(ExternalServiceError);
        });
    });

    describe('getStats', () => {
        it('returns correct stats', async () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 5 });
            const conn = await pool.acquire();
            const stats = pool.getStats();
            expect(stats.total).toBe(1);
            expect(stats.idle).toBe(0);
            expect(stats.pending).toBe(0);
            expect(stats.utilization).toBe(1);
            pool.release(conn);
        });

        it('logs warning when utilization exceeds 0.8', async () => {
            const factory = makeFactory();
            const logger = { warn: jest.fn() };
            const pool = new ConnectionPool({ factory, min: 0, max: 5, logger });
            const conns = await Promise.all([
                pool.acquire(), pool.acquire(), pool.acquire(), pool.acquire(), pool.acquire(),
            ]);
            pool.getStats();
            expect(logger.warn).toHaveBeenCalled();
            conns.forEach(c => pool.release(c));
        });

        it('does not log warning when utilization is low', async () => {
            const factory = makeFactory();
            const logger = { warn: jest.fn() };
            const pool = new ConnectionPool({ factory, min: 0, max: 10, logger });
            const conn = await pool.acquire();
            pool.release(conn);
            pool.getStats();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('returns zero utilization when total is 0', () => {
            const factory = makeFactory();
            const pool = new ConnectionPool({ factory, min: 0, max: 5 });
            const stats = pool.getStats();
            expect(stats.utilization).toBe(0);
        });
    });
});
