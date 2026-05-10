const StructuredLogger = require('../StructuredLogger');

describe('StructuredLogger', () => {
    let logger;

    beforeEach(() => {
        logger = new StructuredLogger({ minLevel: 'debug' });
    });

    describe('log output structure', () => {
        it('includes timestamp, level, and message in every log entry', () => {
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            logger.info('test message');

            expect(output).toHaveLength(1);
            expect(output[0]).toMatchObject({
                level: 'info',
                message: 'test message',
            });
            expect(output[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });

        it('accepts (data, message) signature and merges data into entry', () => {
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            logger.info({ botId: 'bot-1', userId: 'user-1', requestId: 'req-1' }, 'with context');

            expect(output[0]).toMatchObject({
                level: 'info',
                message: 'with context',
                botId: 'bot-1',
                userId: 'user-1',
                requestId: 'req-1',
            });
        });

        it('accepts (message) signature without data', () => {
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            logger.info('simple message');

            expect(output[0].message).toBe('simple message');
        });
    });

    describe('log levels', () => {
        it('calls console.debug for debug level', () => {
            const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
            logger.debug('debug msg');
            expect(spy).toHaveBeenCalled();
        });

        it('calls console.info for info level', () => {
            const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
            logger.info('info msg');
            expect(spy).toHaveBeenCalled();
        });

        it('calls console.warn for warn level', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            logger.warn('warn msg');
            expect(spy).toHaveBeenCalled();
        });

        it('calls console.error for error level', () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            logger.error('error msg');
            expect(spy).toHaveBeenCalled();
        });

        it('calls console.error for fatal level', () => {
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            logger.fatal('fatal msg');
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('minimum log level filtering', () => {
        it('suppresses messages below the configured minimum level', () => {
            const warnLogger = new StructuredLogger({ minLevel: 'warn' });
            const spy = jest.spyOn(console, 'info').mockImplementation(() => {});
            const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

            warnLogger.info('should be suppressed');
            warnLogger.debug('should be suppressed');

            expect(spy).not.toHaveBeenCalled();
            expect(debugSpy).not.toHaveBeenCalled();
        });

        it('outputs messages at or above the minimum level', () => {
            const warnLogger = new StructuredLogger({ minLevel: 'warn' });
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            warnLogger.warn('warn passes');
            warnLogger.error('error passes');
            warnLogger.fatal('fatal passes');

            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy).toHaveBeenCalledTimes(2);
        });

        it('defaults to info level', () => {
            const defaultLogger = new StructuredLogger();
            const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
            const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

            defaultLogger.debug('suppressed');
            defaultLogger.info('passes');

            expect(debugSpy).not.toHaveBeenCalled();
            expect(infoSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('sensitive data redaction', () => {
        it('redacts password fields', () => {
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            logger.info({ password: 'secret123', userId: 'u1' }, 'login attempt');

            expect(output[0].password).toBe('[REDACTED]');
            expect(output[0].userId).toBe('u1');
        });

        it('redacts token fields', () => {
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            logger.info({ token: 'abc123', botId: 'b1' }, 'token check');

            expect(output[0].token).toBe('[REDACTED]');
            expect(output[0].botId).toBe('b1');
        });

        it('redacts apiKey fields', () => {
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            logger.info({ apiKey: 'key-xyz' }, 'api call');

            expect(output[0].apiKey).toBe('[REDACTED]');
        });
    });

    describe('child logger', () => {
        it('creates a child logger with pre-bound context', () => {
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            const child = logger.child({ botId: 'bot-42', requestId: 'req-99' });
            child.info('child message');

            expect(output[0]).toMatchObject({
                botId: 'bot-42',
                requestId: 'req-99',
                message: 'child message',
            });
        });

        it('child context is merged with per-call data', () => {
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            const child = logger.child({ botId: 'bot-1' });
            child.info({ userId: 'user-5' }, 'merged');

            expect(output[0]).toMatchObject({
                botId: 'bot-1',
                userId: 'user-5',
                message: 'merged',
            });
        });

        it('child inherits parent minLevel', () => {
            const parent = new StructuredLogger({ minLevel: 'error' });
            const child = parent.child({ botId: 'b1' });
            const spy = jest.spyOn(console, 'info').mockImplementation(() => {});

            child.info('should be suppressed');

            expect(spy).not.toHaveBeenCalled();
        });

        it('redacts sensitive fields in child context', () => {
            const child = logger.child({ token: 'secret-token', botId: 'b1' });
            const output = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => output.push(JSON.parse(msg)));

            child.info('check redaction');

            expect(output[0].token).toBe('[REDACTED]');
            expect(output[0].botId).toBe('b1');
        });
    });

    describe('output format', () => {
        it('outputs valid JSON', () => {
            const rawOutput = [];
            jest.spyOn(console, 'info').mockImplementation((msg) => rawOutput.push(msg));

            logger.info({ botId: 'b1' }, 'json check');

            expect(() => JSON.parse(rawOutput[0])).not.toThrow();
        });
    });
});
