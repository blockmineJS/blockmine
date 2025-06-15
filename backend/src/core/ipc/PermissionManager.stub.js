
function sendIpcMessage(type, payload) {
    if (process.send) {
        process.send({ type, ...payload });
    }
}

async function registerPermissions(botId, permissions) {
    sendIpcMessage('register_permissions', { botId, permissions });
}

async function registerGroup(botId, groupConfig) {
    sendIpcMessage('register_group', { botId, groupConfig });
}

async function addPermissionsToGroup(botId, groupName, permissionNames) {
    sendIpcMessage('add_permissions_to_group', { botId, groupName, permissionNames });
}

module.exports = {
    registerPermissions,
    registerGroup,
    addPermissionsToGroup,
};