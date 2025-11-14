/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers, defaultValue = null) {
    const args = context.args || {};
    const argName = node.data?.argumentName || '';

    if (pinId === 'value') {
        return args && argName && args[argName] !== undefined ? args[argName] : defaultValue;
    } else if (pinId === 'exists') {
        return args && argName && args[argName] !== undefined;
    }

    return null;
}

module.exports = {
    evaluate,
};
