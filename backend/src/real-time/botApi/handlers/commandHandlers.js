const { botManager } = require('../../../core/services');
const logger = require('../../../lib/logger');

async function handleExecuteCommand(socket, payload) {
    const { username, command, args } = payload;
    const botId = socket.botId;

    try {
        if (!botManager.isBotRunning(botId)) {
            return socket.emit('command:error', { error: 'Bot is not running' });
        }
        if (!username) {
            return socket.emit('command:error', { error: 'Username is required.' });
        }


        const result = await botManager.validateAndExecuteCommandForApi(botId, username, command, args);
        socket.emit('command:result', { result });

    } catch (error) {
        logger.error(`[Bot API] Error executing command '${command}' for bot ${botId}:`, error);
        socket.emit('command:error', { error: error.message });
    }
}

module.exports = {
    handleExecuteCommand,
};
