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
        const pinCount = node.data?.pinCount || 2;
        let finalString = '';
        for (let i = 0; i < pinCount; i++) {
            const part = await resolvePinValue(node, `pin_${i}`, '');
            finalString += String(part ?? '');
        }
        return finalString;
    }

    return '';
}

module.exports = {
    evaluate,
};
