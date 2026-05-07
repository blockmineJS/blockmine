const User = require('../../UserService');

async function evaluate(node, pinId, context, helpers) {
    if (pinId !== 'has_permission') return null;
    const { resolvePinValue } = helpers;

    const userIdentifier = await resolvePinValue(node, 'user', null);
    const permission = await resolvePinValue(node, 'permission', node.data?.permission || '');

    let username = null;
    if (typeof userIdentifier === 'string') username = userIdentifier;
    else if (userIdentifier?.username) username = userIdentifier.username;

    if (!username || !permission) return false;

    const user = await User.getUser(username, context.botId);
    if (!user) return false;

    if (user.permissionsSet) {
        return user.permissionsSet.has('*') || user.permissionsSet.has(permission);
    }

    return false;
}

module.exports = { evaluate };
