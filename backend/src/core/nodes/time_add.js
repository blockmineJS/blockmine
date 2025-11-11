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

        if (date instanceof Date && !isNaN(date.getTime())) {
            try {
                const duration = {
                    years: await resolvePinValue(node, 'years', 0),
                    months: await resolvePinValue(node, 'months', 0),
                    weeks: await resolvePinValue(node, 'weeks', 0),
                    days: await resolvePinValue(node, 'days', 0),
                    hours: await resolvePinValue(node, 'hours', 0),
                    minutes: await resolvePinValue(node, 'minutes', 0),
                    seconds: await resolvePinValue(node, 'seconds', 0),
                };
                return add(date, duration);
            } catch (error) {
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
