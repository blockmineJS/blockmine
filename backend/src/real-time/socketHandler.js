const { Server } = require('socket.io');
const config = require('../config');

const { botManager } = require('../core/services');
const presence = require('./presence');
const { initializeBotApiNamespace } = require('./botApi');
const { getTraceCollector } = require('../core/services/TraceCollectorService');
const { initializeDebugManager, getGlobalDebugManager } = require('../core/services/DebugSessionManager');

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

    // Инициализируем TraceCollector с Socket.IO
    const traceCollector = getTraceCollector();
    traceCollector.setSocketIO(io);

    initializeDebugManager(io);


    initializeBotApiNamespace(io);

    io.on('connection', (socket) => {
        // Сохраняем decoded информацию о пользователе из токена
        const token = socket.handshake?.auth?.token;
        if (token) {
            const jwt = require('jsonwebtoken');
            const config = require('../config');
            try {
                socket.decoded = jwt.verify(token, config.security.jwtSecret, { algorithms: ['HS256'] });
            } catch (e) {
                console.warn('[Socket] Failed to decode token:', e.message);
            }
        }

        presence.handleConnection(io, socket);

        socket.on('disconnect', () => {
            botManager.handleSocketDisconnect(socket);

            // Удаляем пользователя из всех debug комнат
            const debugManager = getGlobalDebugManager();
            for (const [graphId, debugState] of debugManager.graphDebugStates) {
                if (debugState.connectedUsers.has(socket.id)) {
                    debugState.removeUser(socket.id);
                    const room = debugState.getRoomName();
                    io.to(room).emit('debug:user-left', {
                        userCount: debugState.connectedUsers.size,
                        users: Array.from(debugState.connectedUsers.values())
                    });
                }
            }
        });

        socket.on('plugin:ui:subscribe', ({ botId, pluginName }) => {
            botManager.subscribeToPluginUi(botId, pluginName, socket);
        });

        socket.on('plugin:ui:unsubscribe', ({ botId, pluginName }) => {
            botManager.unsubscribeFromPluginUi(botId, pluginName, socket);
        });

        // Debug events
        socket.on('debug:join', ({ botId, graphId }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.getOrCreate(botId, graphId);
            const room = debugState.getRoomName();

            socket.join(room);

            // Получаем информацию о пользователе из токена
            const userInfo = {
                socketId: socket.id,
                userId: socket.decoded?.userId,
                username: socket.decoded?.username || 'Unknown'
            };
            debugState.addUser(socket.id, userInfo);

            console.log(`[Debug] User ${userInfo.username} (${socket.id}) joined debug room for graph ${graphId}`);

            socket.emit('debug:state', debugState.getState());

            socket.to(room).emit('debug:user-joined', {
                userCount: debugState.connectedUsers.size,
                users: Array.from(debugState.connectedUsers.values())
            });
        });

        socket.on('debug:set-breakpoint', ({ graphId, nodeId, condition }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);
            if (!debugState) {
                console.warn(`[Debug] Graph ${graphId} not found for set-breakpoint`);
                return;
            }

            debugState.addBreakpoint(nodeId, condition, socket.id);
            console.log(`[Debug] Breakpoint added to node ${nodeId} in graph ${graphId}`);
        });

        socket.on('debug:remove-breakpoint', ({ graphId, nodeId }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);
            if (!debugState) {
                console.warn(`[Debug] Graph ${graphId} not found for remove-breakpoint`);
                return;
            }

            debugState.removeBreakpoint(nodeId);
            console.log(`[Debug] Breakpoint removed from node ${nodeId} in graph ${graphId}`);
        });

        socket.on('debug:toggle-breakpoint', ({ graphId, nodeId, enabled }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);
            if (!debugState) {
                console.warn(`[Debug] Graph ${graphId} not found for toggle-breakpoint`);
                return;
            }

            debugState.toggleBreakpoint(nodeId, enabled);
            console.log(`[Debug] Breakpoint toggled for node ${nodeId} in graph ${graphId}, enabled: ${enabled}`);
        });

        socket.on('debug:continue', ({ sessionId, overrides }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.getBySessionId(sessionId);
            if (!debugState) {
                console.warn(`[Debug] Session ${sessionId} not found for continue`);
                return;
            }

            console.log(`[Debug] Continuing execution for session ${sessionId}`);
            debugState.resume(overrides);
        });

        socket.on('debug:stop', ({ sessionId }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.getBySessionId(sessionId);
            if (!debugState) {
                console.warn(`[Debug] Session ${sessionId} not found for stop`);
                return;
            }

            console.log(`[Debug] Stopping execution for session ${sessionId}`);
            debugState.stop();
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