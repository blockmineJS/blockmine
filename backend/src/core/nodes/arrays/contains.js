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
    const element = await resolvePinValue(node, 'element', null);

    if (Array.isArray(arr)) {
        const index = arr.indexOf(element);
        memo.set(`${node.id}:index`, index);

        if (pinId === 'result') {
            return index !== -1;
        } else if (pinId === 'index') {
            return index;
        }
    } else {
        memo.set(`${node.id}:index`, -1);

        if (pinId === 'result') {
            return false;
        } else if (pinId === 'index') {
            return -1;
        }
    }

    return null;
}

module.exports = {
    evaluate,
};
