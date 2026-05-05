const { ConfigurationError } = require('../errors');

const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;
const VALID_NODE_ENVS = ['development', 'production', 'test'];
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];

class ConfigValidator {
    validate(config) {
        const errors = [];

        if (!config || typeof config !== 'object') {
            errors.push('config.errors.config_required');
            return { valid: false, errors };
        }

        const server = config.server || {};
        const security = config.security || {};

        if (!server.host || typeof server.host !== 'string') {
            errors.push('config.errors.server_host_required');
        }

        const port = server.port;
        if (port === undefined || port === null) {
            errors.push('config.errors.server_port_required');
        } else if (!Number.isInteger(port) || port < 1 || port > 65535) {
            errors.push('config.errors.server_port_invalid');
        }

        if (!security.jwtSecret || typeof security.jwtSecret !== 'string') {
            errors.push('config.errors.jwt_secret_required');
        } else if (security.jwtSecret.length < 32) {
            errors.push('config.errors.jwt_secret_too_short');
        }

        if (!security.encryptionKey || typeof security.encryptionKey !== 'string') {
            errors.push('config.errors.encryption_key_required');
        } else if (!HEX_64_REGEX.test(security.encryptionKey)) {
            errors.push('config.errors.encryption_key_invalid');
        }

        return { valid: errors.length === 0, errors };
    }

    validateEnv() {
        const errors = [];
        const warnings = [];

        const nodeEnv = process.env.NODE_ENV;
        if (nodeEnv !== undefined && !VALID_NODE_ENVS.includes(nodeEnv)) {
            errors.push('config.errors.node_env_invalid');
        }

        const logLevel = process.env.LOG_LEVEL;
        if (logLevel !== undefined && !VALID_LOG_LEVELS.includes(logLevel)) {
            errors.push('config.errors.log_level_invalid');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    validateAndThrow(config) {
        const result = this.validate(config);
        if (!result.valid) {
            throw new ConfigurationError('config.errors.invalid_configuration', {
                context: { errors: result.errors },
            });
        }
    }
}

module.exports = ConfigValidator;
