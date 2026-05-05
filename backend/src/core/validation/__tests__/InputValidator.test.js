const {
    validateString,
    validateInteger,
    validatePluginManifest,
    validateBotConfig,
    sanitizeString,
} = require('../InputValidator');

describe('InputValidator', () => {
    describe('sanitizeString', () => {
        it('removes script tags', () => {
            const result = sanitizeString('<script>alert("xss")</script>hello');
            expect(result).not.toContain('<script>');
            expect(result).toContain('hello');
        });

        it('removes SQL injection patterns', () => {
            const result = sanitizeString("1 UNION SELECT * FROM users");
            expect(result.toLowerCase()).not.toContain('union select');
        });

        it('removes path traversal patterns', () => {
            const result = sanitizeString('../../etc/passwd');
            expect(result).not.toContain('../');
        });

        it('removes javascript: protocol', () => {
            const result = sanitizeString('javascript:alert(1)');
            expect(result.toLowerCase()).not.toContain('javascript:');
        });

        it('returns empty string for non-string input', () => {
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
            expect(sanitizeString(123)).toBe('');
        });

        it('returns clean string unchanged', () => {
            expect(sanitizeString('hello world')).toBe('hello world');
        });
    });

    describe('validateString', () => {
        it('returns valid for a normal string', () => {
            const result = validateString('hello');
            expect(result.valid).toBe(true);
            expect(result.value).toBe('hello');
        });

        it('returns error when required and empty', () => {
            const result = validateString('', { required: true });
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.string.required');
        });

        it('returns valid when not required and empty', () => {
            const result = validateString('');
            expect(result.valid).toBe(true);
        });

        it('returns error when below minLength', () => {
            const result = validateString('ab', { minLength: 5 });
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.string.minLength');
        });

        it('returns error when above maxLength', () => {
            const result = validateString('hello world', { maxLength: 5 });
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.string.maxLength');
        });

        it('returns error when pattern does not match', () => {
            const result = validateString('abc123', { pattern: /^\d+$/ });
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.string.pattern');
        });

        it('returns valid when pattern matches', () => {
            const result = validateString('12345', { pattern: /^\d+$/ });
            expect(result.valid).toBe(true);
        });

        it('sanitizes dangerous content', () => {
            const result = validateString('<script>alert(1)</script>safe');
            expect(result.valid).toBe(true);
            expect(result.value).not.toContain('<script>');
        });

        it('returns error for non-string type', () => {
            const result = validateString(42);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.string.type');
        });
    });

    describe('validateInteger', () => {
        it('returns valid for a normal integer', () => {
            const result = validateInteger(5);
            expect(result.valid).toBe(true);
            expect(result.value).toBe(5);
        });

        it('parses string integers', () => {
            const result = validateInteger('42');
            expect(result.valid).toBe(true);
            expect(result.value).toBe(42);
        });

        it('returns error when required and missing', () => {
            const result = validateInteger(undefined, { required: true });
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.integer.required');
        });

        it('returns valid when not required and missing', () => {
            const result = validateInteger(undefined);
            expect(result.valid).toBe(true);
        });

        it('returns error for float', () => {
            const result = validateInteger(3.14);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.integer.type');
        });

        it('returns error when below min', () => {
            const result = validateInteger(0, { min: 1 });
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.integer.min');
        });

        it('returns error when above max', () => {
            const result = validateInteger(100, { max: 50 });
            expect(result.valid).toBe(false);
            expect(result.error).toBe('validation.integer.max');
        });

        it('returns valid at boundary values', () => {
            expect(validateInteger(1, { min: 1, max: 65535 }).valid).toBe(true);
            expect(validateInteger(65535, { min: 1, max: 65535 }).valid).toBe(true);
        });
    });

    describe('validatePluginManifest', () => {
        const validManifest = {
            name: 'my-plugin',
            version: '1.0.0',
            main: 'index.js',
        };

        it('returns valid for a correct manifest', () => {
            const result = validatePluginManifest(validManifest);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('returns error when name is missing', () => {
            const result = validatePluginManifest({ ...validManifest, name: undefined });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.manifest.name.required');
        });

        it('returns error when version is not semver', () => {
            const result = validatePluginManifest({ ...validManifest, version: 'not-semver' });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.manifest.version.semver');
        });

        it('returns error when main is missing', () => {
            const result = validatePluginManifest({ ...validManifest, main: '' });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.manifest.main.required');
        });

        it('accepts optional description', () => {
            const result = validatePluginManifest({ ...validManifest, description: 'A plugin' });
            expect(result.valid).toBe(true);
        });

        it('returns error when description is not a string', () => {
            const result = validatePluginManifest({ ...validManifest, description: 123 });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.manifest.description.type');
        });

        it('accepts optional dependencies as object', () => {
            const result = validatePluginManifest({ ...validManifest, dependencies: { 'other-plugin': '^1.0.0' } });
            expect(result.valid).toBe(true);
        });

        it('returns error when dependencies is an array', () => {
            const result = validatePluginManifest({ ...validManifest, dependencies: [] });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.manifest.dependencies.type');
        });

        it('accepts optional settings as object', () => {
            const result = validatePluginManifest({ ...validManifest, settings: { key: 'value' } });
            expect(result.valid).toBe(true);
        });

        it('returns error for non-object input', () => {
            const result = validatePluginManifest(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.manifest.type');
        });

        it('accepts semver with prerelease', () => {
            const result = validatePluginManifest({ ...validManifest, version: '1.0.0-beta.1' });
            expect(result.valid).toBe(true);
        });
    });

    describe('validateBotConfig', () => {
        const validConfig = {
            host: 'localhost',
            port: 25565,
            username: 'testbot',
        };

        it('returns valid for a correct config', () => {
            const result = validateBotConfig(validConfig);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('returns error when host is missing', () => {
            const result = validateBotConfig({ ...validConfig, host: '' });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.botConfig.host.required');
        });

        it('returns error when port is missing', () => {
            const result = validateBotConfig({ ...validConfig, port: undefined });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.botConfig.port.required');
        });

        it('returns error when port is out of range', () => {
            const result = validateBotConfig({ ...validConfig, port: 0 });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.botConfig.port.range');
        });

        it('returns error when port exceeds 65535', () => {
            const result = validateBotConfig({ ...validConfig, port: 70000 });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.botConfig.port.range');
        });

        it('returns error when username is missing', () => {
            const result = validateBotConfig({ ...validConfig, username: '' });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.botConfig.username.required');
        });

        it('accepts optional password', () => {
            const result = validateBotConfig({ ...validConfig, password: 'secret' });
            expect(result.valid).toBe(true);
        });

        it('returns error when password is not a string', () => {
            const result = validateBotConfig({ ...validConfig, password: 123 });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.botConfig.password.type');
        });

        it('accepts optional version', () => {
            const result = validateBotConfig({ ...validConfig, version: '1.19.4' });
            expect(result.valid).toBe(true);
        });

        it('accepts optional proxy as object', () => {
            const result = validateBotConfig({ ...validConfig, proxy: { host: 'proxy.example.com', port: 8080 } });
            expect(result.valid).toBe(true);
        });

        it('returns error when proxy is not an object', () => {
            const result = validateBotConfig({ ...validConfig, proxy: 'proxy.example.com' });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.botConfig.proxy.type');
        });

        it('returns error for non-object input', () => {
            const result = validateBotConfig(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('validation.botConfig.type');
        });

        it('accepts port boundary values 1 and 65535', () => {
            expect(validateBotConfig({ ...validConfig, port: 1 }).valid).toBe(true);
            expect(validateBotConfig({ ...validConfig, port: 65535 }).valid).toBe(true);
        });
    });
});
