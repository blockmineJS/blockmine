const { handleGetStatus } = require('./statusHandlers');
const { handleSendMessage } = require('./messageHandlers');
const { handleTriggerGraph } = require('./graphHandlers');
const { handleGetUser, handleUpdateUser } = require('./userHandlers');
const { handleCallGraph } = require('./graphWebSocketHandlers');
const { handleExecuteCommand } = require('./commandHandlers');

/**
 * Регистрирует все обработчики действий для сокета
 */
function registerActionHandlers(socket) {
    socket.on('action:get_status', () => {
        handleGetStatus(socket);
    });

    socket.on('action:send_message', (payload) => {
        handleSendMessage(socket, payload);
    });

    socket.on('action:trigger_graph', async (payload) => {
        await handleTriggerGraph(socket, payload);
    });

    socket.on('action:call_graph', async (payload) => {
        await handleCallGraph(socket, payload);
    });

    socket.on('action:get_user', async (payload) => {
        await handleGetUser(socket, payload);
    });

    socket.on('action:update_user', async (payload) => {
        await handleUpdateUser(socket, payload);
    });

    socket.on('action:execute_command', async (payload) => {
        await handleExecuteCommand(socket, payload);
    });
}

module.exports = {
    registerActionHandlers,
};
