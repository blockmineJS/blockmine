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

    const obj = await resolvePinValue(node, 'object', {});
    const key = await resolvePinValue(node, 'key', '');
    const exists = obj.hasOwnProperty(key);

    memo.set(`${node.id}:value`, exists ? obj[key] : null);

    if (pinId === 'result') {
        return exists;
    } else if (pinId === 'value') {
        return memo.get(`${node.id}:value`);
    }

    return null;
}

module.exports = {
    evaluate,
};
