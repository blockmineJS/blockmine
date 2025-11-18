const { Server } = require('socket.io');
const config = require('../config');

const { botManager } = require('../core/services');
const presence = require('./presence');
const { initializeBotApiNamespace } = require('./botApi');
const { getTraceCollector } = require('../core/services/TraceCollectorService');
const { initializeDebugManager, getGlobalDebugManager } = require('../core/services/DebugSessionManager');
const { initializeCollaborationManager, getGlobalCollaborationManager } = require('../core/services/GraphCollaborationManager');

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
    initializeCollaborationManager(io);


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

        socket.on('debug:leave', ({ botId, graphId }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);

            if (!debugState) {
                return;
            }

            const room = debugState.getRoomName();
            debugState.removeUser(socket.id);

            // Если это был последний пользователь - очищаем breakpoints
            if (debugState.connectedUsers.size === 0) {
                debugState.clearAllBreakpoints();

                // Если есть активное выполнение на паузе - останавливаем его
                if (debugState.activeExecution) {
                    debugState.stop();
                }
            }

            socket.leave(room);

            socket.to(room).emit('debug:user-left', {
                userCount: debugState.connectedUsers.size,
                users: Array.from(debugState.connectedUsers.values())
            });
        });

        socket.on('debug:set-breakpoint', ({ graphId, nodeId, condition }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);
            if (!debugState) {
                return;
            }

            debugState.addBreakpoint(nodeId, condition, socket.id);
        });

        socket.on('debug:remove-breakpoint', ({ graphId, nodeId }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);
            if (!debugState) {
                return;
            }

            debugState.removeBreakpoint(nodeId);
        });

        socket.on('debug:toggle-breakpoint', ({ graphId, nodeId, enabled }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);
            if (!debugState) {
                return;
            }

            debugState.toggleBreakpoint(nodeId, enabled);
        });

        socket.on('debug:continue', ({ sessionId, overrides, stepMode }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.getBySessionId(sessionId);
            if (!debugState) {
                return;
            }

            debugState.resume(overrides, stepMode || false);
        });

        socket.on('debug:stop', ({ sessionId }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.getBySessionId(sessionId);
            if (!debugState) {
                return;
            }

            debugState.stop();
        });

        socket.on('debug:update-value', ({ botId, graphId, key, value }) => {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);
            if (!debugState) {
                return;
            }

            console.log(`[Debug] Value updated by ${socket.decoded?.username || 'Unknown'}: ${key} =`, value);

            // Сохраняем изменение в pendingOverrides
            debugState.setValue(key, value);

            // Транслируем изменение всем подключенным пользователям
            debugState.broadcast('debug:value-updated', {
                key,
                value,
                updatedBy: socket.decoded?.username || 'Unknown'
            });
        });

        // Hot reload графов при сохранении
        socket.on('graph:updated', async ({ botId, graphId }) => {

            try {
                const eventGraphManager = botManager.eventGraphManager;

                if (eventGraphManager) {
                    // Перезагружаем графы для бота
                    await eventGraphManager.loadGraphsForBot(botId);


                    // Уведомляем всех пользователей о перезагрузке через collaboration manager
                    const collabManager = getGlobalCollaborationManager();
                    collabManager.broadcastGraphReloaded(botId, graphId);
                } else {
                    console.warn(`[Graph Hot Reload] EventGraphManager not found!`);
                }
            } catch (error) {
                console.error(`[Graph Hot Reload] Error reloading graphs for bot ${botId}:`, error);
            }
        });

        // ========== COLLABORATIVE EDITING EVENTS ==========

        // Присоединение к графу для совместного редактирования
        socket.on('collab:join', ({ botId, graphId, debugMode }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                const username = socket.decoded?.username || 'Anonymous';
                const userId = socket.decoded?.userId || null;

                collabManager.joinGraph(socket, { botId, graphId, username, userId, debugMode });
            } catch (error) {
                console.error('[Collab] Error joining graph:', error);
            }
        });

        // Покидание графа
        socket.on('collab:leave', ({ botId, graphId }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.leaveGraph(socket, { botId, graphId });
            } catch (error) {
                console.error('[Collab] Error leaving graph:', error);
            }
        });

        // Обновление позиции курсора
        socket.on('collab:cursor', ({ botId, graphId, x, y }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.updateCursor(socket, { botId, graphId, x, y });
            } catch (error) {
                console.error('[Collab] Error updating cursor:', error);
            }
        });

        // Обновление выбранных нод
        socket.on('collab:selection', ({ botId, graphId, nodeIds }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.updateSelectedNodes(socket, { botId, graphId, nodeIds });
            } catch (error) {
                console.error('[Collab] Error updating selection:', error);
            }
        });

        // Изменение режима отладки
        socket.on('collab:mode-change', ({ botId, graphId, debugMode }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.updateDebugMode(socket, { botId, graphId, debugMode });
            } catch (error) {
                console.error('[Collab] Error updating debug mode:', error);
            }
        });

        // Инициализация состояния графа (вызывается первым пользователем после загрузки)
        socket.on('collab:init-graph-state', ({ botId, graphId, nodes, edges }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.initializeGraphState(socket, { botId, graphId, nodes, edges });
            } catch (error) {
                console.error('[Collab] Error initializing graph state:', error);
            }
        });

        // Изменение нод (движение, создание, удаление, обновление)
        socket.on('collab:nodes', ({ botId, graphId, type, data }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.broadcastNodeChange(socket, { botId, graphId, type, data });
            } catch (error) {
                console.error('[Collab] Error broadcasting node change:', error);
            }
        });

        // Изменение связей (создание, удаление)
        socket.on('collab:edges', ({ botId, graphId, type, data }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.broadcastEdgeChange(socket, { botId, graphId, type, data });
            } catch (error) {
                console.error('[Collab] Error broadcasting edge change:', error);
            }
        });

        // Начало создания соединения (пользователь начал тянуть линию)
        socket.on('collab:connection-start', ({ botId, graphId, fromX, fromY, fromNodeId, fromHandleId }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.startConnection(socket, { botId, graphId, fromX, fromY, fromNodeId, fromHandleId });
            } catch (error) {
                console.error('[Collab] Error starting connection:', error);
            }
        });

        // Обновление позиции соединения (пользователь двигает мышью с зажатой линией)
        socket.on('collab:connection-update', ({ botId, graphId, toX, toY }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.updateConnection(socket, { botId, graphId, toX, toY });
            } catch (error) {
                console.error('[Collab] Error updating connection:', error);
            }
        });

        // Завершение создания соединения (пользователь отпустил линию)
        socket.on('collab:connection-end', ({ botId, graphId }) => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.endConnection(socket, { botId, graphId });
            } catch (error) {
                console.error('[Collab] Error ending connection:', error);
            }
        });

        // При отключении удаляем пользователя из всех комнат
        socket.on('disconnect', () => {
            try {
                const collabManager = getGlobalCollaborationManager();
                collabManager.removeUserFromAllRooms(socket);
            } catch (error) {
                if (error.message !== 'GraphCollaborationManager not initialized! Call initializeCollaborationManager(io) first.') {
                    console.error('[Collab] Error on disconnect:', error);
                }
            }
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