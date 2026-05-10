const User = require('../../UserService');

async function execute(node, context, helpers) {
    const { resolvePinValue, traverse } = helpers;

    const userIdentifier = await resolvePinValue(node, 'user', null);
    const groupName = await resolvePinValue(node, 'group', node.data?.group || '');

    let username = null;
    if (typeof userIdentifier === 'string') username = userIdentifier;
    else if (userIdentifier?.username) username = userIdentifier.username;

    if (username && groupName) {
        const user = await User.getUser(username, context.botId);
        if (user) {
            await user.removeGroup(groupName);
            User.clearCache(username, context.botId);
        }
    }

    await traverse(node, 'exec');
}

module.exports = { execute };
