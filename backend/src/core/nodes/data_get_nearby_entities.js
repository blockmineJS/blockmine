/**
 * Нода для получения списка существ рядом с ботом
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    if (pinId === 'entities') {
        // Получаем радиус из входного пина (по умолчанию 32 блока)
        const radius = await resolvePinValue(node, 'radius', 32);

        // Получаем список существ через botApi
        if (context.bot && context.bot.getNearbyEntities) {
            const entities = await context.bot.getNearbyEntities(null, radius);
            return entities || [];
        }

        return [];
    }

    return null;
}

module.exports = {
    evaluate,
};

