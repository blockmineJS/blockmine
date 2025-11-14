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
        const op = node.data?.operation || 'AND';
        const inputs = [];
        const pinCount = node.data?.pinCount || 2;

        for (let i = 0; i < pinCount; i++) {
            const value = await resolvePinValue(node, `pin_${i}`, false);
            inputs.push(value);
        }

        switch (op) {
            case 'AND': return inputs.every(Boolean);
            case 'OR': return inputs.some(Boolean);
            case 'NOT': return !inputs[0];
            default: return false;
        }
    }

    return false;
}

module.exports = {
    evaluate,
};
