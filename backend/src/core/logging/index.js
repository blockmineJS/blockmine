const StructuredLogger = require('./StructuredLogger');

const defaultLogger = new StructuredLogger({
    minLevel: process.env.LOG_LEVEL || 'info',
});

module.exports = { StructuredLogger, defaultLogger };
