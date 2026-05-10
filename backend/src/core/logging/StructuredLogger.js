const ErrorHandler = require('../errors/ErrorHandler');

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};

class StructuredLogger {
    constructor({ minLevel = 'info', context = {} } = {}) {
        this.minLevel = minLevel;
        this.context = context;
    }

    _log(level, dataOrMessage, message) {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return;

        let data = {};
        let msg;

        if (message !== undefined) {
            data = typeof dataOrMessage === 'object' && dataOrMessage !== null ? dataOrMessage : {};
            msg = message;
        } else {
            msg = dataOrMessage;
        }

        const sanitized = ErrorHandler.sanitize({ ...this.context, ...data });

        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message: msg,
            ...sanitized,
        };

        const output = JSON.stringify(entry);

        if (level === 'fatal' || level === 'error') {
            console.error(output);
        } else if (level === 'warn') {
            console.warn(output);
        } else if (level === 'debug') {
            console.debug(output);
        } else {
            console.info(output);
        }
    }

    debug(dataOrMessage, message) {
        this._log('debug', dataOrMessage, message);
    }

    info(dataOrMessage, message) {
        this._log('info', dataOrMessage, message);
    }

    warn(dataOrMessage, message) {
        this._log('warn', dataOrMessage, message);
    }

    error(dataOrMessage, message) {
        this._log('error', dataOrMessage, message);
    }

    fatal(dataOrMessage, message) {
        this._log('fatal', dataOrMessage, message);
    }

    child(context) {
        return new StructuredLogger({
            minLevel: this.minLevel,
            context: ErrorHandler.sanitize({ ...this.context, ...context }),
        });
    }
}

module.exports = StructuredLogger;
