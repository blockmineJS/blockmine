const { EventEmitter } = require('events');
const { BaseError } = require('./index');

const SENSITIVE_PATTERNS = [
    /password/i,
    /token/i,
    /secret/i,
    /\bkey\b/i,
    /authorization/i,
    /cookie/i,
    /apiKey/i,
    /api_key/i,
];

class ErrorHandler extends EventEmitter {
    constructor({ logger }) {
        super();
        this.logger = logger;
    }

    handle(error, context = {}) {
        const sanitizedContext = ErrorHandler.sanitize(context);
        const isOperational = ErrorHandler.isOperational(error);

        const logEntry = {
            botId: sanitizedContext.botId,
            userId: sanitizedContext.userId,
            requestId: sanitizedContext.requestId,
            timestamp: new Date().toISOString(),
            code: error.code,
            statusCode: error.statusCode,
            messageKey: error.messageKey || error.message,
            isOperational,
            stack: error.stack,
            context: sanitizedContext,
        };

        if (isOperational) {
            this.logger.warn(logEntry, 'errors.operational');
        } else {
            this.logger.error(logEntry, 'errors.unexpected');
        }

        this.emit('error:handled', { error, context: sanitizedContext, isOperational });

        return {
            success: false,
            error: {
                code: error.code || 'INTERNAL_ERROR',
                messageKey: error.messageKey || 'errors.internal',
                statusCode: error.statusCode || 500,
                isOperational,
            },
        };
    }

    static isOperational(error) {
        return error instanceof BaseError && error.isOperational === true;
    }

    static sanitize(data) {
        if (data === null || data === undefined) return data;

        if (typeof data !== 'object') return data;

        if (Array.isArray(data)) {
            return data.map(ErrorHandler.sanitize);
        }

        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => {
                const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
                if (isSensitive) return [key, '[REDACTED]'];
                if (value && typeof value === 'object') return [key, ErrorHandler.sanitize(value)];
                return [key, value];
            })
        );
    }
}

module.exports = ErrorHandler;
