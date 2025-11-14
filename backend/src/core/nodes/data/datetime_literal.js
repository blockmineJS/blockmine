/**
 * @param {object} node
 * @param {string} pinId
 * @param {object} context
 * @param {object} helpers
 * @returns {Promise<any>}
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    if (pinId === 'value') {
        const dateString = await resolvePinValue(node, 'date', '');
        if (dateString) {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        return new Date();
    }

    return null;
}

module.exports = {
    evaluate,
};
