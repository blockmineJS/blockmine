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

    if (pinId === 'value') {
        const numPins = node.data?.pinCount || 0;
        const items = [];

        for (let i = 0; i < numPins; i++) {
            const value = await resolvePinValue(node, `pin_${i}`) ||
                         node.data?.[`item_${i}`] ||
                         node.data?.[`value_${i}`];
            items.push(value);
        }

        return items;
    }

    return [];
}

module.exports = {
    evaluate,
};
