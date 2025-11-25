/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    if (pinId === 'result') {
        const array = await resolvePinValue(node, 'array', []);
        const separator = String(await resolvePinValue(node, 'separator', ', '));

        if (!Array.isArray(array)) {
            return '';
        }

        return array.join(separator);
    }

    return '';
}

module.exports = {
    evaluate,
};
