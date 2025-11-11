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
        const op = node.data?.operation || 'after';

        if (dateLeft instanceof Date && dateRight instanceof Date) {
            switch (op) {
                case 'after': return isAfter(dateLeft, dateRight);
                case 'before': return isBefore(dateLeft, dateRight);
                case 'equal': return isEqual(dateLeft, dateRight);
                default: return false;
            }
        }
        return false;
    }

    return null;
}

module.exports = {
    evaluate,
};
