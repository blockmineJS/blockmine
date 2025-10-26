/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    if (pinId === 'new_object') {
        const obj = await resolvePinValue(node, 'object', {});
        const key = await resolvePinValue(node, 'key', '');
        const val = await resolvePinValue(node, 'value');

        const newObj = { ...obj };
        newObj[key] = val;
        return newObj;
    }

    return {};
}

module.exports = {
    evaluate,
};
