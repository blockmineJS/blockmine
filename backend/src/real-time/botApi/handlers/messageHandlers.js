const { botManager } = require('../../../core/services');

/**
 * action:send_message - Отправить сообщение от имени бота
 */
function handleSendMessage(socket, payload) {
    // Проверяем права
    if (socket.permissions === 'Read') {
        return socket.emit('error', {
            action: 'send_message',
            message: 'Insufficient permissions: Read-only key',
        });
    }

    try {
        const { chatType = 'chat', message, recipient } = payload;

        if (!message) {
            return socket.emit('error', {
                action: 'send_message',
                message: 'Message is required',
            });
        }

        // Для private чата нужен recipient
        if (chatType === 'private' && !recipient) {
            return socket.emit('error', {
                action: 'send_message',
                message: 'Recipient is required for private messages',
            });
        }

        // Проверяем, что бот онлайн
        if (!botManager.isBotRunning(socket.botId)) {
            return socket.emit('error', {
                action: 'send_message',
                message: 'Bot is offline',
            });
        }

        // Отправляем сообщение боту
        const result = botManager.sendMessageToBot(socket.botId, message, chatType, recipient);

        if (!result.success) {
            return socket.emit('error', {
                action: 'send_message',
                message: result.message || 'Failed to send message',
            });
        }

        socket.emit('action:result', {
            action: 'send_message',
            success: true,
        });
    } catch (error) {
        console.error('[Bot API] Ошибка отправки сообщения:', error);
        socket.emit('error', {
            action: 'send_message',
            message: 'Internal error',
        });
    }
}

module.exports = {
    handleSendMessage,
};
