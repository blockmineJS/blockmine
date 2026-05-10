const BaseError = require('./BaseError');

class ValidationError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'VALIDATION_ERROR', statusCode: 400, ...options });
    }
}

class NotFoundError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'NOT_FOUND', statusCode: 404, ...options });
    }
}

class ConflictError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'CONFLICT', statusCode: 409, ...options });
    }
}

class AuthorizationError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'AUTHORIZATION_ERROR', statusCode: 403, ...options });
    }
}

class ExternalServiceError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'EXTERNAL_SERVICE_ERROR', statusCode: 502, ...options });
    }
}

class ConfigurationError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'CONFIGURATION_ERROR', statusCode: 500, ...options });
    }
}

class PluginError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'PLUGIN_ERROR', statusCode: 500, ...options });
    }
}

class GraphExecutionError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'GRAPH_EXECUTION_ERROR', statusCode: 500, ...options });
    }
}

class BotError extends BaseError {
    constructor(messageKey, options = {}) {
        super(messageKey, { code: 'BOT_ERROR', statusCode: 500, ...options });
    }
}

module.exports = {
    BaseError,
    ValidationError,
    NotFoundError,
    ConflictError,
    AuthorizationError,
    ExternalServiceError,
    ConfigurationError,
    PluginError,
    GraphExecutionError,
    BotError,
};
