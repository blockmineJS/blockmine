const { differenceInMilliseconds } = require('date-fns');

/**
 * @param {object} node
 * @param {string} pinId
 * @param {object} context
 * @param {object} helpers
 * @returns {Promise<any>}
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    if (pinId === 'diff') {
        const dateLeft = await resolvePinValue(node, 'date_left', new Date());
        const dateRight = await resolvePinValue(node, 'date_right', new Date());

        if (dateLeft instanceof Date && !isNaN(dateLeft.getTime()) &&
            dateRight instanceof Date && !isNaN(dateRight.getTime())) {
            return differenceInMilliseconds(dateLeft, dateRight);
        }
        return 0;
    }

    return null;
}

module.exports = {
    evaluate,
};
