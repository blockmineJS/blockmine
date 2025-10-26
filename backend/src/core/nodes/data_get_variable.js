/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    if (pinId === 'value') {
        const varName = node.data?.variableName || node.data?.selectedVariable || '';
        if (!varName) {
            console.warn('[GraphExecutionEngine] data:get_variable: не указано имя переменной', node.data);
            return null;
        }
        return context.variables.hasOwnProperty(varName) ? context.variables[varName] : null;
    }

    return null;
}

module.exports = {
    evaluate,
};
