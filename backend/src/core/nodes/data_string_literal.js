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
        let text = String(node.data?.value || '');

        // Парсим и заменяем переменные в формате {varName}
        const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
        const matches = [...text.matchAll(variablePattern)];

        for (const match of matches) {
            const varName = match[1];
            // Получаем значение из динамического пина
            const varValue = await resolvePinValue(node, `var_${varName}`, '');
            text = text.replace(match[0], String(varValue));
        }

        return text;
    }

    return '';
}

module.exports = {
    evaluate,
};
