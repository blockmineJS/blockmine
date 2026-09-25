const User = require('../../UserService');
const { tryGraphWrite, graphUser } = require('../../graphServices');

async function execute(node, context, helpers) {
    const { resolvePinValue, traverse } = helpers;

    const userIdentifier = await resolvePinValue(node, 'user', null);
    const groupName = await resolvePinValue(node, 'group', node.data?.group || '');

    let username = null;
    if (typeof userIdentifier === 'string') username = userIdentifier;
    else if (userIdentifier?.username) username = userIdentifier.username;

    if (username && groupName) {
        const isolated = await tryGraphWrite(context, 'add_to_group', `${username} -> ${groupName}`, { username, groupName });
        if (isolated?.handled) {
            await traverse(node, 'exec');
            return;
        }
        const user = await graphUser(context, username);
        if (user) {
            await user.addGroup(groupName);
            User.clearCache(username, context.botId);
        }
    }

    await traverse(node, 'exec');
}

module.exports = { execute };
