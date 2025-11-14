/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers, defaultValue = null) {
    const { resolvePinValue } = helpers;

    if (pinId === 'value') {
        const obj = await resolvePinValue(node, 'object', {});
        const key = await resolvePinValue(node, 'key', '');
        return obj[key] ?? defaultValue;
    }

    return null;
}

module.exports = {
    evaluate,
};
