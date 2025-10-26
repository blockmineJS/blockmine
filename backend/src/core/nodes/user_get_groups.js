const User = require('../UserService');

/**
 * @param {object} node - Экземпляр узла из графа.
 * @param {string} pinId - Идентификатор выходного пина, значение которого нужно вычислить.
 * @param {object} context - Контекст выполнения графа.
 * @param {object} helpers - Вспомогательные функции движка.
 * @param {function} helpers.resolvePinValue - Функция для получения значения с входного пина.
 * @returns {Promise<any>} - Вычисленное значение для выходного пина.
 */
async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;

    const userIdentifier = await resolvePinValue(node, 'user', null);
    let groups = [];
    let usernameToFind = null;

    if (typeof userIdentifier === 'string') {
        usernameToFind = userIdentifier;
    } else if (userIdentifier && typeof userIdentifier === 'object' && userIdentifier.username) {
        usernameToFind = userIdentifier.username;
    }

    if (usernameToFind) {
        const user = await User.getUser(usernameToFind, context.botId);
        if (user && user.groups) {
            groups = user.groups.map(g => g.group.name);
        }
    }
    
    return groups;
}

module.exports = {
    evaluate,
};
