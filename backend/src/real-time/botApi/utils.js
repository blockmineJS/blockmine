/**
 * Отправляет событие всем подключенным API клиентам бота
 * @param {Server} io - Socket.IO сервер
 * @param {number} botId - ID бота
 * @param {string} eventName - Название события (например, "chat:message")
 * @param {object} data - Данные события
 */
function broadcastToApiClients(io, botId, eventName, data) {
    try {
        const apiNamespace = io.of('/bot-api');
        apiNamespace.to(`bot_${botId}`).emit(eventName, data);
    } catch (error) {
        console.error('[Bot API] Ошибка broadcast:', error);
    }
}

/**
 * Отправляет событие изменения статуса бота всем подключенным API клиентам
 * @param {Server} io - Socket.IO сервер
 * @param {number} botId - ID бота
 * @param {boolean} online - Онлайн ли бот
 */
function broadcastBotStatus(io, botId, online) {
    try {
        const apiNamespace = io.of('/bot-api');
        apiNamespace.to(`bot_${botId}`).emit('bot:status', { online });
        console.log(`[Bot API] Broadcast статуса бота ${botId}: ${online ? 'ONLINE' : 'OFFLINE'}`);
    } catch (error) {
        console.error('[Bot API] Ошибка broadcast статуса:', error);
    }
}

/**
 * Получить количество подключенных API клиентов для конкретного бота
 * @param {Server} io - Socket.IO сервер
 * @param {number} botId - ID бота
 * @returns {number} Количество подключенных клиентов
 */
function getConnectedClientsCount(io, botId) {
    try {
        const apiNamespace = io.of('/bot-api');
        const room = apiNamespace.adapter.rooms.get(`bot_${botId}`);
        return room ? room.size : 0;
    } catch (error) {
        console.error('[Bot API] Ошибка получения количества клиентов:', error);
        return 0;
    }
}

module.exports = {
    broadcastToApiClients,
    broadcastBotStatus,
    getConnectedClientsCount,
};
