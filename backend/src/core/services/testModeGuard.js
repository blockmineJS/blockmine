const { AsyncLocalStorage } = require('async_hooks');

const graphTestStorage = new AsyncLocalStorage();

function runInGraphTest(fn) {
    return graphTestStorage.run({ active: true }, fn);
}

function isGraphTestMode() {
    return Boolean(graphTestStorage.getStore()?.active);
}

function blockTestWrite(context, operation, summary) {
    if (!context || !context.__testMode) return false;

    if (typeof context.recordEffect === 'function') {
        const text = summary === undefined || summary === null ? String(operation) : String(summary);
        context.recordEffect({
            kind: 'db_write_blocked',
            operation: String(operation || 'write'),
            summary: text.slice(0, 500),
        });
    }

    return true;
}

module.exports = {
    blockTestWrite,
    runInGraphTest,
    isGraphTestMode,
};
