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

    if (pinId === 'result') {
        const arr = await resolvePinValue(node, 'array', []);
        const index = await resolvePinValue(node, 'index', -1);

        if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
            return arr || [];
        }

        const newArr = [...arr];
        newArr.splice(index, 1);
        return newArr;
    }

    return [];
}

module.exports = {
    evaluate,
};
