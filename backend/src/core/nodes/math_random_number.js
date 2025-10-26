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
        const minRaw = await resolvePinValue(node, 'min', node.data.min ?? '0');
        const maxRaw = await resolvePinValue(node, 'max', node.data.max ?? '1');

        const minStr = String(minRaw);
        const maxStr = String(maxRaw);

        const min = parseFloat(minStr.replace(',', '.'));
        const max = parseFloat(maxStr.replace(',', '.'));

        if (isNaN(min) || isNaN(max)) {
            return NaN;
        }

        const produceFloat = minStr.includes('.') || minStr.includes(',') || !Number.isInteger(min) ||
                            maxStr.includes('.') || maxStr.includes(',') || !Number.isInteger(max);

        if (produceFloat) {
            return Math.random() * (max - min) + min;
        } else {
            const minInt = Math.ceil(min);
            const maxInt = Math.floor(max);
            return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
        }
    }

    return 0;
}

module.exports = {
    evaluate,
};
