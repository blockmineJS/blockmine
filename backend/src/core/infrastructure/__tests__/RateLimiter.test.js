const RateLimiter = require('../RateLimiter');

describe('RateLimiter', () => {
    describe('constructor defaults', () => {
        it('uses default options when none provided', () => {
            const limiter = new RateLimiter();
            expect(limiter.windowMs).toBe(60000);
            expect(limiter.max).toBe(100);
            expect(limiter.keyPrefix).toBe('');
        });

        it('accepts custom options', () => {
            const limiter = new RateLimiter({ windowMs: 1000, max: 5, keyPrefix: 'api' });
            expect(limiter.windowMs).toBe(1000);
            expect(limiter.max).toBe(5);
            expect(limiter.keyPrefix).toBe('api');
        });
    });

    describe('check', () => {
        it('allows requests under the limit', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 3 });
            const result = limiter.check('user1');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(2);
        });

        it('tracks remaining count correctly across multiple requests', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 3 });
            limiter.check('user1');
            limiter.check('user1');
            const result = limiter.check('user1');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(0);
        });

        it('blocks request when limit is exceeded', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 2 });
            limiter.check('user1');
            limiter.check('user1');
            const result = limiter.check('user1');
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });

        it('returns retryAfter when blocked', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 1 });
            limiter.check('user1');
            const result = limiter.check('user1');
            expect(result.allowed).toBe(false);
            expect(result.retryAfter).toBeGreaterThan(0);
            expect(result.retryAfter).toBeLessThanOrEqual(60);
        });

        it('does not include retryAfter when allowed', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 5 });
            const result = limiter.check('user1');
            expect(result.retryAfter).toBeUndefined();
        });

        it('returns resetAt as a future timestamp', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 5 });
            const before = Date.now();
            const result = limiter.check('user1');
            expect(result.resetAt).toBeGreaterThan(before);
        });

        it('isolates counts per key', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 2 });
            limiter.check('user1');
            limiter.check('user1');
            const result = limiter.check('user2');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(1);
        });

        it('slides the window and allows requests after old ones expire', () => {
            jest.useFakeTimers();
            const limiter = new RateLimiter({ windowMs: 1000, max: 2 });
            limiter.check('user1');
            limiter.check('user1');
            expect(limiter.check('user1').allowed).toBe(false);
            jest.advanceTimersByTime(1001);
            expect(limiter.check('user1').allowed).toBe(true);
            jest.useRealTimers();
        });
    });

    describe('reset', () => {
        it('clears the counter for a key', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 2 });
            limiter.check('user1');
            limiter.check('user1');
            limiter.reset('user1');
            const result = limiter.check('user1');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(1);
        });

        it('handles reset on non-existent key without error', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 5 });
            expect(() => limiter.reset('nonexistent')).not.toThrow();
        });
    });

    describe('middleware', () => {
        function makeReqRes(ip = '127.0.0.1', user = null) {
            const headers = {};
            const res = {
                set: jest.fn((k, v) => { headers[k] = v; }),
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                _headers: headers,
            };
            const req = { ip, user };
            return { req, res };
        }

        it('calls next() when request is allowed', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 5 });
            const { req, res } = makeReqRes();
            const next = jest.fn();
            limiter.middleware()(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('sets rate limit headers on allowed request', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 5 });
            const { req, res } = makeReqRes();
            const next = jest.fn();
            limiter.middleware()(req, res, next);
            expect(res.set).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
            expect(res.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
            expect(res.set).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
        });

        it('returns 429 when limit exceeded', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 1 });
            const { req, res } = makeReqRes();
            const next = jest.fn();
            limiter.middleware()(req, res, next);
            limiter.middleware()(req, res, next);
            expect(res.status).toHaveBeenCalledWith(429);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'errors.rateLimit.exceeded', retryAfter: expect.any(Number) })
            );
        });

        it('uses req.user.id as key when user is present', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 1 });
            const { req: req1, res: res1 } = makeReqRes('1.1.1.1', { id: 42 });
            const { req: req2, res: res2 } = makeReqRes('2.2.2.2', { id: 42 });
            const next = jest.fn();
            limiter.middleware()(req1, res1, next);
            next.mockClear();
            limiter.middleware()(req2, res2, next);
            expect(next).not.toHaveBeenCalled();
        });

        it('uses req.ip as key when no user', () => {
            const limiter = new RateLimiter({ windowMs: 60000, max: 1 });
            const { req: req1, res: res1 } = makeReqRes('1.1.1.1');
            const { req: req2, res: res2 } = makeReqRes('2.2.2.2');
            const next = jest.fn();
            limiter.middleware()(req1, res1, next);
            next.mockClear();
            limiter.middleware()(req2, res2, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
