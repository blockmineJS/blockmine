async function evaluate(node, pinId, context, helpers) {
    if (pinId === 'name') {
        return context.bot?.username || null;
    }
    return null;
}

module.exports = { evaluate };
