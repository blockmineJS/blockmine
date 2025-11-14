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
        const value = await resolvePinValue(node, 'value');
        const targetType = node.data?.targetType || 'String';

        switch (targetType) {
            case 'String':
                // Для объектов и массивов используем JSON.stringify
                if (typeof value === 'object' && value !== null) {
                    try {
                        return JSON.stringify(value);
                    } catch (e) {
                        return String(value ?? '');
                    }
                }
                return String(value ?? '');
            case 'Number':
                const num = Number(value);
                return isNaN(num) ? 0 : num;
            case 'Boolean':
                return ['true', '1', 'yes'].includes(String(value).toLowerCase());
            default:
                return value;
        }
    }

    return null;
}

module.exports = {
    evaluate,
};
