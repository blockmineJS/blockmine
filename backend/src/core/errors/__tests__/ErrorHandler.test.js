const ErrorHandler = require('../ErrorHandler');
const { BaseError, ValidationError, NotFoundError } = require('../index');

function makeLogger() {
    return {
        warn: jest.fn(),
        error: jest.fn(),
    };
}

describe('ErrorHandler', () => {
    describe('isOperational', () => {
        it('returns true for BaseError with isOperational=true', () => {
            const err = new ValidationError('errors.validation');
            expect(ErrorHandler.isOperational(err)).toBe(true);
        });

        it('returns false for BaseError with isOperational=false', () => {
            const err = new BaseError('errors.critical', { isOperational: false });
            expect(ErrorHandler.isOperational(err)).toBe(false);
        });

        it('returns false for plain Error', () => {
            expect(ErrorHandler.isOperational(new Error('boom'))).toBe(false);
        });

        it('returns false for non-error values', () => {
            expect(ErrorHandler.isOperational(null)).toBe(false);
            expect(ErrorHandler.isOperational('string')).toBe(false);
            expect(ErrorHandler.isOperational(42)).toBe(false);
        });
    });

    describe('sanitize', () => {
        it('redacts password field', () => {
            const result = ErrorHandler.sanitize({ password: 'secret123' });
            expect(result.password).toBe('[REDACTED]');
        });

        it('redacts token field', () => {
            const result = ErrorHandler.sanitize({ token: 'abc' });
            expect(result.token).toBe('[REDACTED]');
        });

        it('redacts secret field', () => {
            const result = ErrorHandler.sanitize({ secret: 'xyz' });
            expect(result.secret).toBe('[REDACTED]');
        });

        it('redacts key field', () => {
            const result = ErrorHandler.sanitize({ key: 'mykey' });
            expect(result.key).toBe('[REDACTED]');
        });

        it('redacts authorization field', () => {
            const result = ErrorHandler.sanitize({ authorization: 'Bearer token' });
            expect(result.authorization).toBe('[REDACTED]');
        });

        it('redacts cookie field', () => {
            const result = ErrorHandler.sanitize({ cookie: 'session=abc' });
            expect(result.cookie).toBe('[REDACTED]');
        });

        it('redacts apiKey field', () => {
            const result = ErrorHandler.sanitize({ apiKey: 'key123' });
            expect(result.apiKey).toBe('[REDACTED]');
        });

        it('redacts api_key field', () => {
            const result = ErrorHandler.sanitize({ api_key: 'key123' });
            expect(result.api_key).toBe('[REDACTED]');
        });

        it('preserves non-sensitive fields', () => {
            const result = ErrorHandler.sanitize({ botId: 'bot1', userId: 'user1' });
            expect(result.botId).toBe('bot1');
            expect(result.userId).toBe('user1');
        });

        it('redacts nested sensitive fields', () => {
            const result = ErrorHandler.sanitize({ user: { password: 'secret', name: 'Alice' } });
            expect(result.user.password).toBe('[REDACTED]');
            expect(result.user.name).toBe('Alice');
        });

        it('handles arrays', () => {
            const result = ErrorHandler.sanitize([{ password: 'x' }, { name: 'y' }]);
            expect(result[0].password).toBe('[REDACTED]');
            expect(result[1].name).toBe('y');
        });

        it('returns primitives unchanged', () => {
            expect(ErrorHandler.sanitize('hello')).toBe('hello');
            expect(ErrorHandler.sanitize(42)).toBe(42);
            expect(ErrorHandler.sanitize(null)).toBeNull();
        });
    });

    describe('handle', () => {
        it('logs operational errors with warn', () => {
            const logger = makeLogger();
            const handler = new ErrorHandler({ logger });
            const err = new ValidationError('errors.validation');

            handler.handle(err, { botId: 'b1', userId: 'u1' });

            expect(logger.warn).toHaveBeenCalledTimes(1);
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('logs non-operational errors with error', () => {
            const logger = makeLogger();
            const handler = new ErrorHandler({ logger });
            const err = new Error('unexpected');

            handler.handle(err, {});

            expect(logger.error).toHaveBeenCalledTimes(1);
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('returns structured error response', () => {
            const logger = makeLogger();
            const handler = new ErrorHandler({ logger });
            const err = new NotFoundError('errors.notFound');

            const result = handler.handle(err);

            expect(result.success).toBe(false);
            expect(result.error.code).toBe('NOT_FOUND');
            expect(result.error.statusCode).toBe(404);
            expect(result.error.messageKey).toBe('errors.notFound');
            expect(result.error.isOperational).toBe(true);
        });

        it('sanitizes sensitive data in context before logging', () => {
            const logger = makeLogger();
            const handler = new ErrorHandler({ logger });
            const err = new ValidationError('errors.validation');

            handler.handle(err, { password: 'secret', botId: 'b1' });

            const loggedEntry = logger.warn.mock.calls[0][0];
            expect(loggedEntry.context.password).toBe('[REDACTED]');
            expect(loggedEntry.context.botId).toBe('b1');
        });

        it('emits error:handled event', () => {
            const logger = makeLogger();
            const handler = new ErrorHandler({ logger });
            const err = new ValidationError('errors.validation');
            const listener = jest.fn();

            handler.on('error:handled', listener);
            handler.handle(err, { botId: 'b1' });

            expect(listener).toHaveBeenCalledTimes(1);
            const payload = listener.mock.calls[0][0];
            expect(payload.error).toBe(err);
            expect(payload.isOperational).toBe(true);
        });

        it('includes timestamp in log entry', () => {
            const logger = makeLogger();
            const handler = new ErrorHandler({ logger });
            const err = new ValidationError('errors.validation');

            handler.handle(err, {});

            const loggedEntry = logger.warn.mock.calls[0][0];
            expect(loggedEntry.timestamp).toBeDefined();
            expect(new Date(loggedEntry.timestamp).toString()).not.toBe('Invalid Date');
        });

        it('falls back to INTERNAL_ERROR code for plain errors', () => {
            const logger = makeLogger();
            const handler = new ErrorHandler({ logger });
            const err = new Error('plain error');

            const result = handler.handle(err);

            expect(result.error.code).toBe('INTERNAL_ERROR');
            expect(result.error.statusCode).toBe(500);
            expect(result.error.messageKey).toBe('errors.internal');
        });
    });
});
