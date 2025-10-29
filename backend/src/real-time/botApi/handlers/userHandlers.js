const UserService = require('../../../core/UserService');

/**
 * action:get_user - Получить данные о пользователе
 */
async function handleGetUser(socket, payload) {
    try {
        const { username } = payload;

        if (!username) {
            return socket.emit('error', {
                action: 'get_user',
                message: 'username is required',
            });
        }

        const user = await UserService.getUser(username, socket.botId);

        if (!user) {
            return socket.emit('error', {
                action: 'get_user',
                message: `User "${username}" not found`,
            });
        }

        socket.emit('action:result', {
            action: 'get_user',
            success: true,
            user: {
                username: user.username,
                isBlacklisted: user.isBlacklisted,
                groups: user.groups ? user.groups.map(g => g.group.name) : [],
                permissions: Array.from(user.permissionsSet || []),
            },
        });
    } catch (error) {
        console.error('[Bot API] Ошибка получения пользователя:', error);
        socket.emit('error', {
            action: 'get_user',
            message: 'Internal error',
        });
    }
}

/**
 * action:update_user - Обновить данные пользователя
 */
async function handleUpdateUser(socket, payload) {
    // Проверяем права
    if (socket.permissions === 'Read') {
        return socket.emit('error', {
            action: 'update_user',
            message: 'Insufficient permissions: Read-only key',
        });
    }

    try {
        const { username, operation, value } = payload;

        if (!username) {
            return socket.emit('error', {
                action: 'update_user',
                message: 'username is required',
            });
        }

        if (!operation) {
            return socket.emit('error', {
                action: 'update_user',
                message: 'operation is required (addGroup, removeGroup, setBlacklist)',
            });
        }

        const user = await UserService.getUser(username, socket.botId);

        if (!user) {
            return socket.emit('error', {
                action: 'update_user',
                message: `User "${username}" not found`,
            });
        }

        let result;

        switch (operation) {
            case 'addGroup':
                if (!value) {
                    return socket.emit('error', {
                        action: 'update_user',
                        message: 'value (group name) is required for addGroup operation',
                    });
                }
                result = await user.addGroup(value);
                break;

            case 'removeGroup':
                if (!value) {
                    return socket.emit('error', {
                        action: 'update_user',
                        message: 'value (group name) is required for removeGroup operation',
                    });
                }
                result = await user.removeGroup(value);
                break;

            case 'setBlacklist':
                if (typeof value !== 'boolean') {
                    return socket.emit('error', {
                        action: 'update_user',
                        message: 'value (true/false) is required for setBlacklist operation',
                    });
                }
                result = await user.setBlacklist(value);
                break;

            default:
                return socket.emit('error', {
                    action: 'update_user',
                    message: 'Invalid operation. Use: addGroup, removeGroup, setBlacklist',
                });
        }

        socket.emit('action:result', {
            action: 'update_user',
            success: true,
            operation,
            result,
        });
    } catch (error) {
        console.error('[Bot API] Ошибка обновления пользователя:', error);
        socket.emit('error', {
            action: 'update_user',
            message: error.message || 'Internal error',
        });
    }
}

module.exports = {
    handleGetUser,
    handleUpdateUser,
};
