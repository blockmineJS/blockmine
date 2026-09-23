const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { botManager } = require('../core/services');

/**
 * Аутентификация Panel API Key для WebSocket
 */
async function authenticateSocket(socket, next) {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== 'string') {
        return next(new Error('API ключ не предоставлен'));
    }

    try {
        const allKeys = await prisma.panelApiKey.findMany({
            where: {
                isActive: true,
                prefix: token.slice(0, 10),
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                user: {
                    include: {
                        role: true,
                        botAccess: {
                            include: {
                                bot: true
                            }
                        }
                    }
                }
            }
        });

        let matchedKey = null;
        for (const keyRecord of allKeys) {
            if (await bcrypt.compare(token, keyRecord.keyHash)) {
                matchedKey = keyRecord;
                break;
            }
        }

        if (!matchedKey) {
            return next(new Error('Неверный API ключ'));
        }

        await prisma.panelApiKey.update({
            where: { id: matchedKey.id },
            data: { lastUsedAt: new Date() }
        });

        let permissions;
        try {
            const rolePermissions = JSON.parse(matchedKey.user.role.permissions);
            if (matchedKey.customScopes) {
                const scopes = JSON.parse(matchedKey.customScopes);
                permissions = rolePermissions.includes('*')
                    ? scopes
                    : scopes.filter((s) => rolePermissions.includes(s));
            } else {
                permissions = rolePermissions;
            }
        } catch (parseError) {
            console.error('Ошибка парсинга прав доступа:', parseError);
            return next(new Error('Ошибка обработки прав доступа'));
        }

        let availableBots;
        if (matchedKey.user.allBots) {
            availableBots = await prisma.bot.findMany({
                select: { id: true, username: true }
            });
        } else {
            availableBots = matchedKey.user.botAccess.map(access => ({
                id: access.bot.id,
                username: access.bot.username
            }));
        }

        socket.user = {
            id: matchedKey.user.id,
            userId: matchedKey.user.id,
            uuid: matchedKey.user.uuid,
            username: matchedKey.user.username,
            roleId: matchedKey.user.roleId,
            roleName: matchedKey.user.role.name,
            permissions,
            allBots: matchedKey.user.allBots,
            availableBotIds: availableBots.map(b => b.id)
        };

        socket.apiKey = {
            id: matchedKey.id,
            name: matchedKey.name,
            prefix: matchedKey.prefix
        };

        next();
    } catch (err) {
        console.error('Ошибка аутентификации Panel WebSocket:', err);
        next(new Error('Ошибка аутентификации'));
    }
}

/**
 * Проверка доступа к боту
 */
function canAccessBot(socket, botId) {
    if (socket.user.allBots) return true;
    return socket.user.availableBotIds.includes(Number(botId));
}

/**
 * Проверка прав доступа
 */
function hasPermission(socket, permission) {
    if (!socket.user || !Array.isArray(socket.user.permissions)) {
        return false;
    }
    return socket.user.permissions.includes('*') || socket.user.permissions.includes(permission);
}

/**
 * Инициализация Panel namespace
 */
function initializePanelNamespace(io) {
    const panelNamespace = io.of('/panel');

    panelNamespace.use(authenticateSocket);

    panelNamespace.on('connection', (socket) => {
        console.log(`[Panel WS] Connected: ${socket.user.username} (${socket.apiKey.name})`);

        socket.emit('authenticated', {
            user: {
                id: socket.user.id,
                username: socket.user.username,
                role: socket.user.roleName,
                permissions: socket.user.permissions
            },
            apiKey: {
                id: socket.apiKey.id,
                name: socket.apiKey.name,
                prefix: socket.apiKey.prefix
            },
            availableBots: socket.user.availableBotIds
        });

        // ========== SUBSCRIPTIONS ==========

        /**
         * Подписка на каналы событий
         */
        socket.on('subscribe', async ({ channel }, callback) => {
            try {
                // Парсим канал: "bots:status" или "bots:1:events"
                const parts = channel.split(':');
                const resource = parts[0];

                if (resource === 'bots') {
                    if (parts.length === 2 && parts[1] === 'status') {
                        if (socket.user.allBots) {
                            socket.join('bots:status');
                        } else {
                            for (const id of socket.user.availableBotIds) {
                                socket.join(`bots:${id}:status`);
                            }
                        }
                        if (callback) callback({ success: true, channel });
                    } else if (parts.length >= 3) {
                        const botId = parseInt(parts[1]);
                        const eventType = parts[2];

                        if (!canAccessBot(socket, botId)) {
                            if (callback) callback({
                                success: false,
                                error: 'Нет доступа к этому боту'
                            });
                            return;
                        }

                        socket.join(channel);
                        if (callback) callback({ success: true, channel });
                    }
                } else if (resource === 'system') {
                    if (!socket.user.allBots) {
                        if (callback) callback({ success: false, error: 'Нет доступа к системным каналам' });
                        return;
                    }
                    socket.join(channel);
                    if (callback) callback({ success: true, channel });
                } else {
                    if (callback) callback({
                        success: false,
                        error: 'Неизвестный канал'
                    });
                }
            } catch (error) {
                console.error('[Panel WS] Ошибка подписки:', error);
                if (callback) callback({
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * Отписка от каналов
         */
        socket.on('unsubscribe', ({ channel }, callback) => {
            socket.leave(channel);
            if (callback) callback({ success: true, channel });
        });

        // ========== ACTIONS ==========

        /**
         * Отправка сообщения от бота
         */
        socket.on('action:bot:send_message', async ({ botId, message, chatType, recipient }, callback) => {
            try {
                if (!canAccessBot(socket, botId)) {
                    if (callback) callback({ success: false, error: 'Нет доступа к этому боту' });
                    return;
                }

                if (!hasPermission(socket, 'bot:interact')) {
                    if (callback) callback({ success: false, error: 'Нет прав: bot:interact' });
                    return;
                }

                const result = botManager.sendMessageToBot(botId, message, chatType || 'chat', recipient || null);
                if (!result.success) {
                    if (callback) callback({ success: false, error: result.message });
                    return;
                }

                if (callback) callback({ success: true });
            } catch (error) {
                console.error('[Panel WS] Ошибка отправки сообщения:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        /**
         * Выполнение команды
         */
        socket.on('action:bot:execute_command', async ({ botId, username, command, args }, callback) => {
            try {
                if (!canAccessBot(socket, botId)) {
                    if (callback) callback({ success: false, error: 'Нет доступа к этому боту' });
                    return;
                }

                if (!hasPermission(socket, 'bot:interact')) {
                    if (callback) callback({ success: false, error: 'Нет прав: bot:interact' });
                    return;
                }

                if (!username || !command) {
                    if (callback) callback({ success: false, error: 'Нужны username и command' });
                    return;
                }

                const result = await botManager.validateAndExecuteCommandForApi(
                    Number(botId),
                    username,
                    command,
                    args || {}
                );

                if (callback) callback({ success: true, result });
            } catch (error) {
                console.error('[Panel WS] Ошибка выполнения команды:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        /**
         * Запуск бота
         */
        socket.on('action:bot:start', async ({ botId }, callback) => {
            try {
                if (!canAccessBot(socket, botId)) {
                    if (callback) callback({ success: false, error: 'Нет доступа к этому боту' });
                    return;
                }

                if (!hasPermission(socket, 'bot:start_stop')) {
                    if (callback) callback({ success: false, error: 'Нет прав: bot:start_stop' });
                    return;
                }

                const botConfig = await prisma.bot.findUnique({
                    where: { id: Number(botId) },
                    include: { server: true, proxy: true },
                });
                if (!botConfig) {
                    if (callback) callback({ success: false, error: 'Бот не найден' });
                    return;
                }

                const result = await botManager.startBot(botConfig);
                if (result && result.success === false) {
                    if (callback) callback({ success: false, error: result.message });
                    return;
                }

                if (callback) callback({ success: true, message: 'Бот запущен' });
            } catch (error) {
                console.error('[Panel WS] Ошибка запуска бота:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        /**
         * Остановка бота
         */
        socket.on('action:bot:stop', async ({ botId }, callback) => {
            try {
                if (!canAccessBot(socket, botId)) {
                    if (callback) callback({ success: false, error: 'Нет доступа к этому боту' });
                    return;
                }

                if (!hasPermission(socket, 'bot:start_stop')) {
                    if (callback) callback({ success: false, error: 'Нет прав: bot:start_stop' });
                    return;
                }

                await botManager.stopBot(botId);

                if (callback) callback({ success: true, message: 'Бот остановлен' });
            } catch (error) {
                console.error('[Panel WS] Ошибка остановки бота:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        /**
         * Перезапуск бота
         */
        socket.on('action:bot:restart', async ({ botId }, callback) => {
            try {
                if (!canAccessBot(socket, botId)) {
                    if (callback) callback({ success: false, error: 'Нет доступа к этому боту' });
                    return;
                }

                if (!hasPermission(socket, 'bot:start_stop')) {
                    if (callback) callback({ success: false, error: 'Нет прав: bot:start_stop' });
                    return;
                }

                await botManager.restartBot(botId);

                if (callback) callback({ success: true, message: 'Бот перезапущен' });
            } catch (error) {
                console.error('[Panel WS] Ошибка перезапуска бота:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        /**
         * Получение статуса бота
         */
        socket.on('action:bot:get_status', async ({ botId }, callback) => {
            try {
                if (!canAccessBot(socket, botId)) {
                    if (callback) callback({ success: false, error: 'Нет доступа к этому боту' });
                    return;
                }

                const online = botManager.isBotRunning(Number(botId));

                if (callback) callback({
                    success: true,
                    status: {
                        online,
                        connected: online,
                        status: online ? 'running' : 'offline',
                    }
                });
            } catch (error) {
                console.error('[Panel WS] Ошибка получения статуса:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        // ========== DISCONNECT ==========

        socket.on('disconnect', () => {
            console.log(`[Panel WS] Disconnected: ${socket.user.username}`);
        });
    });

    return panelNamespace;
}

/**
 * Broadcast события в Panel namespace
 */
function broadcastToPanelNamespace(io, channel, data, eventName) {
    const panelNamespace = io.of('/panel');
    panelNamespace.to(channel).emit(eventName || channel, data);
}

module.exports = {
    initializePanelNamespace,
    broadcastToPanelNamespace
};
