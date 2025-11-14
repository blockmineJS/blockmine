/**
 * @param {object} node
 * @param {string} pinId
 * @param {object} context
 * @param {object} helpers
 * @returns {Promise<any>}
 */
async function evaluate(node, pinId, context, helpers) {
    if (pinId === 'now') {
        return new Date();
    }

    return null;
}

module.exports = {
    evaluate,
};
