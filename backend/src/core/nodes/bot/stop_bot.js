async function execute(node, context, helpers) {
    process.send({ type: 'stop' });
}

module.exports = { execute };
