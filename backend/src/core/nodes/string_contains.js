/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.traverse - Функция для перехода к следующему узлу.
 */
async function execute(node, context, helpers) {
    const { traverse } = helpers;
    await traverse(node, 'exec');
}

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
        const haystack = String(await resolvePinValue(node, 'haystack', ''));
        const needle = String(await resolvePinValue(node, 'needle', ''));
        const caseSensitive = await resolvePinValue(node, 'case_sensitive', false);

        if (caseSensitive) {
            return haystack.includes(needle);
        } else {
            return haystack.toLowerCase().includes(needle.toLowerCase());
        }
    }

    return null;
}

module.exports = {
    execute,
    evaluate,
};
