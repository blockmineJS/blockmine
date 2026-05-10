const CircuitBreaker = require('../CircuitBreaker');
const { ExternalServiceError } = require('../../errors/index');

const { CLOSED, OPEN, HALF_OPEN } = CircuitBreaker.STATE;

function makeBreaker(opts = {}) {
    return new CircuitBreaker({ failureThreshold: 3, successThreshold: 2, timeout: 1000, ...opts });
}

describe('CircuitBreaker', () => {
    describe('initial state', () => {
        it('starts in CLOSED state', () => {
            expect(makeBreaker().getState()).toBe(CLOSED);
        });
    });

    describe('CLOSED state', () => {
        it('calls fn and returns result', async () => {
            const cb = makeBreaker();
            const result = await cb.call(async () => 42);
            expect(result).toBe(42);
        });

        it('opens after failureThreshold failures', async () => {
            const cb = makeBreaker({ failureThreshold: 3 });
            const fail = () => { throw new Error('fail'); };
            for (let i = 0; i < 3; i++) {
                await cb.call(fail).catch(() => {});
            }
            expect(cb.getState()).toBe(OPEN);
        });

        it('resets failure count on success', async () => {
            const cb = makeBreaker({ failureThreshold: 3 });
            const fail = () => { throw new Error('fail'); };
            await cb.call(fail).catch(() => {});
            await cb.call(fail).catch(() => {});
            await cb.call(async () => 'ok');
            expect(cb.getStats().failureCount).toBe(0);
            expect(cb.getState()).toBe(CLOSED);
        });
    });

    describe('OPEN state', () => {
        it('throws ExternalServiceError without calling fn', async () => {
            const cb = makeBreaker({ failureThreshold: 1 });
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            expect(cb.getState()).toBe(OPEN);

            const fn = jest.fn();
            await expect(cb.call(fn)).rejects.toBeInstanceOf(ExternalServiceError);
            expect(fn).not.toHaveBeenCalled();
        });

        it('returns fallback value when open', async () => {
            const cb = makeBreaker({ failureThreshold: 1 });
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            const result = await cb.call(jest.fn(), 'fallback');
            expect(result).toBe('fallback');
        });

        it('returns fallback function result when open', async () => {
            const cb = makeBreaker({ failureThreshold: 1 });
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            const result = await cb.call(jest.fn(), () => 'computed');
            expect(result).toBe('computed');
        });

        it('transitions to HALF_OPEN after timeout', async () => {
            jest.useFakeTimers();
            const cb = makeBreaker({ failureThreshold: 1, timeout: 1000 });
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            expect(cb.getState()).toBe(OPEN);
            jest.advanceTimersByTime(1001);
            await cb.call(async () => 'ok');
            jest.useRealTimers();
        });
    });

    describe('HALF_OPEN state', () => {
        async function openThenHalfOpen(cb) {
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            cb.nextAttempt = Date.now() - 1;
        }

        it('closes after successThreshold successes', async () => {
            const cb = makeBreaker({ failureThreshold: 1, successThreshold: 2 });
            await openThenHalfOpen(cb);
            await cb.call(async () => 'ok');
            expect(cb.getState()).toBe(HALF_OPEN);
            await cb.call(async () => 'ok');
            expect(cb.getState()).toBe(CLOSED);
        });

        it('reopens on failure in HALF_OPEN', async () => {
            const cb = makeBreaker({ failureThreshold: 1, successThreshold: 2 });
            await openThenHalfOpen(cb);
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            expect(cb.getState()).toBe(OPEN);
        });
    });

    describe('fallback', () => {
        it('returns fallback on failure in CLOSED state', async () => {
            const cb = makeBreaker({ failureThreshold: 10 });
            const result = await cb.call(() => { throw new Error('fail'); }, 'default');
            expect(result).toBe('default');
        });

        it('calls fallback function on failure', async () => {
            const cb = makeBreaker({ failureThreshold: 10 });
            const result = await cb.call(() => { throw new Error('fail'); }, () => 'computed');
            expect(result).toBe('computed');
        });
    });

    describe('events', () => {
        it('emits stateChange when transitioning to OPEN', async () => {
            const cb = makeBreaker({ failureThreshold: 1 });
            const listener = jest.fn();
            cb.on('stateChange', listener);
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            expect(listener).toHaveBeenCalledWith({ from: CLOSED, to: OPEN });
        });

        it('emits stateChange when transitioning to CLOSED', async () => {
            const cb = makeBreaker({ failureThreshold: 1, successThreshold: 1 });
            const listener = jest.fn();
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            cb.nextAttempt = Date.now() - 1;
            cb.on('stateChange', listener);
            await cb.call(async () => 'ok');
            expect(listener).toHaveBeenCalledWith(expect.objectContaining({ to: CLOSED }));
        });
    });

    describe('logging', () => {
        it('logs state transitions when logger provided', async () => {
            const logger = { warn: jest.fn() };
            const cb = makeBreaker({ failureThreshold: 1, logger });
            await cb.call(() => { throw new Error('fail'); }).catch(() => {});
            expect(logger.warn).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('returns current stats', async () => {
            const cb = makeBreaker();
            const stats = cb.getStats();
            expect(stats.state).toBe(CLOSED);
            expect(stats.failureCount).toBe(0);
            expect(stats.successCount).toBe(0);
            expect(stats.nextAttempt).toBeNull();
        });
    });
});
