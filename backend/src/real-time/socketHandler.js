const { Server } = require('socket.io');
const config = require('../config');

const { botManager } = require('../core/services');
const presence = require('./presence');
const { initializeBotApiNamespace } = require('./botApi');

let io;

function initializeSocket(httpServer) {
    const corsOptions = {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true
    };

    io = new Server(httpServer, {
        cors: corsOptions,
        transports: ['websocket', 'polling']
    });

    // Инициализируем /bot-api namespace для WebSocket API
    initializeBotApiNamespace(io);

    io.on('connection', (socket) => {
        presence.handleConnection(io, socket);

        socket.on('disconnect', () => {
            botManager.handleSocketDisconnect(socket);
        });

        socket.on('plugin:ui:subscribe', ({ botId, pluginName }) => {
            botManager.subscribeToPluginUi(botId, pluginName, socket);
        });

        socket.on('plugin:ui:unsubscribe', ({ botId, pluginName }) => {
            botManager.unsubscribeFromPluginUi(botId, pluginName, socket);
        });
    });

    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.IO not initialized!");
    }
    return io;
}

module.exports = { initializeSocket, getIO };