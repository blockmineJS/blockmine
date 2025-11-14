const User = require('../../UserService');

/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers, defaultValue = null) {
    const { resolvePinValue } = helpers;

    const userIdentifier = await resolvePinValue(node, 'user');
    let userObject = null;

    if (userIdentifier && typeof userIdentifier === 'object' && userIdentifier.username) {
        userObject = userIdentifier;
    } else if (typeof userIdentifier === 'string' && userIdentifier.length > 0) {
        userObject = await User.getUser(userIdentifier, context.botId);
    }

    if (userObject) {
        if (pinId === 'username') {
            return userObject.username;
        } else if (pinId === 'groups') {
            return userObject.groups ? userObject.groups.map(g => g.group?.name).filter(Boolean) : [];
        } else if (pinId === 'permissions') {
            return userObject.permissionsSet ? Array.from(userObject.permissionsSet) : [];
        } else if (pinId === 'isBlacklisted') {
            return !!userObject.isBlacklisted;
        }
    }

    return defaultValue;
}

module.exports = {
    evaluate,
};
