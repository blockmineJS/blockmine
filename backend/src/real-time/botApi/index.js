const { botManager } = require('../../core/services');
const { authenticateApiClient, logConnection } = require('./middleware');
const { registerActionHandlers } = require('./handlers');

/**
 * Инициализирует namespace /bot-api для WebSocket API
 * @param {Server} io - Socket.IO сервер
 */
function initializeBotApiNamespace(io) {
    const apiNamespace = io.of('/bot-api');


    apiNamespace.use(authenticateApiClient);

    apiNamespace.on('connection', async (socket) => {
        console.log(`[Bot API] Клиент подключился к боту ID: ${socket.botId} (ключ: ${socket.keyPrefix})`);

        socket.join(`bot_${socket.botId}`);
        socket.join(`key_${socket.keyId}`);

        const isOnline = botManager.isBotRunning(socket.botId);
        socket.emit('bot:status', { online: isOnline });

        await logConnection(socket, 'connect');

        registerActionHandlers(socket);

        socket.on('disconnect', async () => {
            console.log(`[Bot API] Клиент отключился от бота ID: ${socket.botId} (ключ: ${socket.keyPrefix})`);
            await logConnection(socket, 'disconnect');
        });
    });

    return apiNamespace;
}

module.exports = {
    initializeBotApiNamespace,
    ...require('./utils'),
};
