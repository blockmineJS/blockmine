async function execute(node, context) {
    if (context?.__testMode) {
        context.recordEffect?.({ kind: 'bot', operation: 'restart' });
        return;
    }
    if (process.send) {
        process.send({ type: 'restart' });
    }
}

module.exports = { execute };
