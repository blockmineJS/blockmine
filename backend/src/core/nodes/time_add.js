const { add } = require('date-fns');

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
        const date = await resolvePinValue(node, 'date', new Date());
        const duration = await resolvePinValue(node, 'duration', {});

        if (date instanceof Date) {
            return add(date, duration);
        }
        return new Date();
    }

    return null;
}

module.exports = {
    evaluate,
};
