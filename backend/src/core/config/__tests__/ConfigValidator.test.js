const ConfigValidator = require('../ConfigValidator');
const { ConfigurationError } = require('../../errors');

const VALID_CONFIG = {
    server: {
        host: '127.0.0.1',
        port: 3001,
    },
    security: {
        jwtSecret: 'a'.repeat(32),
        encryptionKey: 'a'.repeat(64),
    },
};

describe('ConfigValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new ConfigValidator();
    });

    describe('validate()', () => {
        it('returns valid for a correct config', () => {
            const result = validator.validate(VALID_CONFIG);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('returns error when config is null', () => {
            const result = validator.validate(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.config_required');
        });

        it('returns error when server.host is missing', () => {
            const config = { ...VALID_CONFIG, server: { ...VALID_CONFIG.server, host: undefined } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.server_host_required');
        });

        it('returns error when server.host is not a string', () => {
            const config = { ...VALID_CONFIG, server: { ...VALID_CONFIG.server, host: 123 } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.server_host_required');
        });

        it('returns error when server.port is missing', () => {
            const config = { ...VALID_CONFIG, server: { host: '127.0.0.1' } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.server_port_required');
        });

        it('returns error when server.port is 0', () => {
            const config = { ...VALID_CONFIG, server: { ...VALID_CONFIG.server, port: 0 } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.server_port_invalid');
        });

        it('returns error when server.port is 65536', () => {
            const config = { ...VALID_CONFIG, server: { ...VALID_CONFIG.server, port: 65536 } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.server_port_invalid');
        });

        it('returns error when server.port is a float', () => {
            const config = { ...VALID_CONFIG, server: { ...VALID_CONFIG.server, port: 3000.5 } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.server_port_invalid');
        });

        it('accepts port 1 and port 65535 as valid boundaries', () => {
            const config1 = { ...VALID_CONFIG, server: { ...VALID_CONFIG.server, port: 1 } };
            const config2 = { ...VALID_CONFIG, server: { ...VALID_CONFIG.server, port: 65535 } };
            expect(validator.validate(config1).valid).toBe(true);
            expect(validator.validate(config2).valid).toBe(true);
        });

        it('returns error when jwtSecret is missing', () => {
            const config = { ...VALID_CONFIG, security: { ...VALID_CONFIG.security, jwtSecret: undefined } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.jwt_secret_required');
        });

        it('returns error when jwtSecret is shorter than 32 chars', () => {
            const config = { ...VALID_CONFIG, security: { ...VALID_CONFIG.security, jwtSecret: 'short' } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.jwt_secret_too_short');
        });

        it('accepts jwtSecret of exactly 32 chars', () => {
            const config = { ...VALID_CONFIG, security: { ...VALID_CONFIG.security, jwtSecret: 'a'.repeat(32) } };
            expect(validator.validate(config).valid).toBe(true);
        });

        it('returns error when encryptionKey is missing', () => {
            const config = { ...VALID_CONFIG, security: { ...VALID_CONFIG.security, encryptionKey: undefined } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.encryption_key_required');
        });

        it('returns error when encryptionKey is not 64 hex chars', () => {
            const config = { ...VALID_CONFIG, security: { ...VALID_CONFIG.security, encryptionKey: 'abc123' } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.encryption_key_invalid');
        });

        it('returns error when encryptionKey contains non-hex chars', () => {
            const config = { ...VALID_CONFIG, security: { ...VALID_CONFIG.security, encryptionKey: 'z'.repeat(64) } };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.encryption_key_invalid');
        });

        it('accepts valid 64-char lowercase hex encryptionKey', () => {
            const config = { ...VALID_CONFIG, security: { ...VALID_CONFIG.security, encryptionKey: 'deadbeef'.repeat(8) } };
            expect(validator.validate(config).valid).toBe(true);
        });

        it('collects multiple errors at once', () => {
            const config = { server: {}, security: {} };
            const result = validator.validate(config);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe('validateEnv()', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            process.env = { ...originalEnv };
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('returns valid when no optional env vars are set', () => {
            delete process.env.NODE_ENV;
            delete process.env.LOG_LEVEL;
            delete process.env.DATABASE_URL;
            delete process.env.GITHUB_TOKEN;
            const result = validator.validateEnv();
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        it('accepts valid NODE_ENV values', () => {
            for (const env of ['development', 'production', 'test']) {
                process.env.NODE_ENV = env;
                expect(validator.validateEnv().valid).toBe(true);
            }
        });

        it('returns error for invalid NODE_ENV', () => {
            process.env.NODE_ENV = 'staging';
            const result = validator.validateEnv();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.node_env_invalid');
        });

        it('accepts valid LOG_LEVEL values', () => {
            for (const level of ['debug', 'info', 'warn', 'error', 'fatal']) {
                process.env.LOG_LEVEL = level;
                expect(validator.validateEnv().valid).toBe(true);
            }
        });

        it('returns error for invalid LOG_LEVEL', () => {
            process.env.LOG_LEVEL = 'verbose';
            const result = validator.validateEnv();
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('config.errors.log_level_invalid');
        });

        it('accepts DATABASE_URL as optional string', () => {
            process.env.DATABASE_URL = 'file:./dev.db';
            const result = validator.validateEnv();
            expect(result.valid).toBe(true);
        });

        it('accepts GITHUB_TOKEN as optional string', () => {
            process.env.GITHUB_TOKEN = 'ghp_sometoken';
            const result = validator.validateEnv();
            expect(result.valid).toBe(true);
        });

        it('returns result with warnings array', () => {
            const result = validator.validateEnv();
            expect(Array.isArray(result.warnings)).toBe(true);
        });
    });

    describe('validateAndThrow()', () => {
        it('does not throw for valid config', () => {
            expect(() => validator.validateAndThrow(VALID_CONFIG)).not.toThrow();
        });

        it('throws ConfigurationError for invalid config', () => {
            expect(() => validator.validateAndThrow(null)).toThrow(ConfigurationError);
        });

        it('throws ConfigurationError with errors in context', () => {
            try {
                validator.validateAndThrow({ server: {}, security: {} });
            } catch (err) {
                expect(err).toBeInstanceOf(ConfigurationError);
                expect(err.context.errors).toBeDefined();
                expect(err.context.errors.length).toBeGreaterThan(0);
            }
        });

        it('thrown error has correct messageKey', () => {
            try {
                validator.validateAndThrow(null);
            } catch (err) {
                expect(err.messageKey).toBe('config.errors.invalid_configuration');
            }
        });
    });
});
