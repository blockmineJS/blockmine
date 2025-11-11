const { isAfter, isBefore, isEqual } = require('date-fns');

/**
 * @param {object} node
 * @param {string} pinId
 * @param {object} context
 * @param {object} helpers
 * @returns {Promise<any>}
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    if (pinId === 'result') {
        const dateLeft = await resolvePinValue(node, 'date_left', new Date());
        const dateRight = await resolvePinValue(node, 'date_right', new Date());
        const op = await resolvePinValue(node, 'operation', 'after');

        if (dateLeft instanceof Date && !isNaN(dateLeft.getTime()) &&
            dateRight instanceof Date && !isNaN(dateRight.getTime())) {
            switch (op) {
                case 'after': return isAfter(dateLeft, dateRight);
                case 'before': return isBefore(dateLeft, dateRight);
                case 'equal': return isEqual(dateLeft, dateRight);
                default: throw new Error(`Неизвестная операция сравнения: ${op}`);
            }
        }
        throw new Error('Ошибка: невалидная дата');
    }

    return null;
}

module.exports = {
    evaluate,
};
