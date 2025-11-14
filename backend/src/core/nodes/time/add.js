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

        if (date instanceof Date && !isNaN(date.getTime())) {
            try {
                return add(date, duration);
            } catch (error) {
                // Либо пробросить ошибку, либо вернуть null
                throw new Error(`Ошибка добавления продолжительности: ${error.message}`);
            }
        }
        throw new Error('Невалидная входная дата');
    }

    return null;
}

module.exports = {
    evaluate,
};
