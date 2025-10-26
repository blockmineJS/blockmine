/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @param {Map} helpers.memo - Map для хранения мемоизированных значений.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue, memo } = helpers;

    const arr = await resolvePinValue(node, 'array', []);
    if (!Array.isArray(arr) || arr.length === 0) {
        return pinId === 'index' ? -1 : null;
    }

    const randomIndex = Math.floor(Math.random() * arr.length);
    memo.set(`${node.id}:index`, randomIndex);

    if (pinId === 'element') {
        return arr[randomIndex];
    } else if (pinId === 'index') {
        return randomIndex;
    }

    return null;
}

module.exports = {
    evaluate,
};
