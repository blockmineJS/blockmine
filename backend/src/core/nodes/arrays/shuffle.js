async function evaluate(node, pinId, context, helpers) {
    if (pinId !== 'shuffled') return null;
    const { resolvePinValue } = helpers;
    const array = await resolvePinValue(node, 'array', []);
    if (!Array.isArray(array)) return [];
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

module.exports = { evaluate };
