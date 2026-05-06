async function evaluate(node, pinId, context, helpers) {
    const { memo } = helpers;
    const cached = memo.get(`${node.id}:${pinId}`);
    if (cached !== undefined) return cached;
    return null;
}

module.exports = { evaluate };
