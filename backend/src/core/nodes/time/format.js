const { format } = require('date-fns');

/**
 * @param {object} node
 * @param {string} pinId
 * @param {object} context
 * @param {object} helpers
 * @returns {Promise<any>}
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    if (pinId === 'formatted') {
        const date = await resolvePinValue(node, 'date', new Date());
        const formatString = await resolvePinValue(node, 'format', 'yyyy-MM-dd HH:mm:ss');

        if (date instanceof Date && !isNaN(date.getTime())) {
            try {
                return format(date, formatString);
            } catch (error) {
                throw new Error(`Ошибка форматирования: ${error.message}`);
            }
        }
        throw new Error('Ошибка: невалидная дата');
    }

    return null;
}

module.exports = {
    evaluate,
};
