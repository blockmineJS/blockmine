class BaseError extends Error {
    constructor(messageKey, { code, statusCode, context = {}, isOperational = true, cause } = {}) {
        super(messageKey);
        this.name = this.constructor.name;
        this.messageKey = messageKey;
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.isOperational = isOperational;
        if (cause) this.cause = cause;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            messageKey: this.messageKey,
            statusCode: this.statusCode,
            context: this.context,
            isOperational: this.isOperational,
            stack: this.stack,
        };
    }
}

module.exports = BaseError;
