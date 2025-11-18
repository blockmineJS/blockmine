/**
 * GraphCollaborationManager
 * Управляет совместным редактированием графов в реальном времени
 */
class GraphCollaborationManager {
    constructor() {
        // Структура: Map<graphId, GraphRoom>
        // GraphRoom = { users: Map<socketId, UserInfo>, io: Socket.IO namespace }
        this.rooms = new Map();
        this.io = null;
    }

    /**
     * Инициализация с Socket.IO instance
     */
    initialize(io) {
        this.io = io;
        console.log('[GraphCollaboration] Manager initialized');
    }

    /**
     * Пользователь присоединяется к графу
     */
    joinGraph(socket, { botId, graphId, username, userId, debugMode = 'normal' }) {
        const roomKey = this.getRoomKey(botId, graphId);

        // Создаем комнату если не существует
        if (!this.rooms.has(roomKey)) {
            this.rooms.set(roomKey, {
                botId,
                graphId,
                users: new Map(),
                // Храним текущее состояние графа для синхронизации при переподключении
                graphState: {
                    nodes: [],
                    edges: [],
                    lastUpdate: null,
                },
            });
            console.log(`[GraphCollaboration] Created room for bot ${botId}, graph ${graphId}`);
        }

        const room = this.rooms.get(roomKey);

        // Добавляем пользователя в комнату
        const userInfo = {
            socketId: socket.id,
            username: username || 'Anonymous',
            userId: userId || null,
            cursor: null, // { x, y }
            selectedNodes: [], // [nodeId, ...]
            color: this.generateUserColor(socket.id), // Уникальный цвет пользователя
            debugMode: debugMode || 'normal', // 'normal' | 'trace' | 'live'
            joinedAt: Date.now(),
        };

        room.users.set(socket.id, userInfo);

        // Присоединяем socket к комнате
        socket.join(roomKey);

        console.log(`[GraphCollaboration] User ${username} (${socket.id}) joined bot ${botId}, graph ${graphId} in ${debugMode} mode. Total users: ${room.users.size}`);

        // Отправляем текущее состояние новому пользователю
        socket.emit('collab:state', {
            users: Array.from(room.users.values()).map(u => ({
                socketId: u.socketId,
                username: u.username,
                userId: u.userId,
                color: u.color,
                cursor: u.cursor,
                selectedNodes: u.selectedNodes,
                debugMode: u.debugMode,
            })),
            // Отправляем текущее состояние графа (если есть другие пользователи)
            graphState: room.users.size > 1 ? room.graphState : null,
        });

        // Уведомляем остальных о новом пользователе
        socket.to(roomKey).emit('collab:user-joined', {
            user: {
                socketId: userInfo.socketId,
                username: userInfo.username,
                userId: userInfo.userId,
                color: userInfo.color,
                debugMode: userInfo.debugMode,
            }
        });

        return room;
    }

    /**
     * Пользователь покидает граф
     */
    leaveGraph(socket, { botId, graphId }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);

        if (!room) return;

        const userInfo = room.users.get(socket.id);
        if (!userInfo) return;

        room.users.delete(socket.id);
        socket.leave(roomKey);

        console.log(`[GraphCollaboration] User ${userInfo.username} (${socket.id}) left bot ${botId}, graph ${graphId}. Remaining users: ${room.users.size}`);

        // Уведомляем остальных
        socket.to(roomKey).emit('collab:user-left', {
            socketId: socket.id,
            username: userInfo.username,
        });

        // Удаляем комнату если пустая
        if (room.users.size === 0) {
            this.rooms.delete(roomKey);
            console.log(`[GraphCollaboration] Removed empty room for bot ${botId}, graph ${graphId}`);
        }
    }

    /**
     * Обновление позиции курсора
     */
    updateCursor(socket, { botId, graphId, x, y }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);

        if (!room) return;

        const userInfo = room.users.get(socket.id);
        if (!userInfo) return;

        userInfo.cursor = { x, y };

        // Broadcast другим пользователям
        socket.to(roomKey).emit('collab:cursor-move', {
            socketId: socket.id,
            username: userInfo.username,
            color: userInfo.color,
            x,
            y,
        });
    }

    /**
     * Обновление режима отладки пользователя
     */
    updateDebugMode(socket, { botId, graphId, debugMode }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);

        if (!room) return;

        const userInfo = room.users.get(socket.id);
        if (!userInfo) return;

        userInfo.debugMode = debugMode;

        console.log(`[GraphCollaboration] User ${userInfo.username} switched to ${debugMode} mode`);

        // Broadcast другим пользователям
        socket.to(roomKey).emit('collab:mode-changed', {
            socketId: socket.id,
            username: userInfo.username,
            debugMode,
        });
    }

    /**
     * Обновление выбранных нод
     */
    updateSelectedNodes(socket, { botId, graphId, nodeIds }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);

        if (!room) return;

        const userInfo = room.users.get(socket.id);
        if (!userInfo) return;

        userInfo.selectedNodes = nodeIds || [];

        // Broadcast другим пользователям
        socket.to(roomKey).emit('collab:selection-changed', {
            socketId: socket.id,
            username: userInfo.username,
            color: userInfo.color,
            nodeIds: userInfo.selectedNodes,
        });
    }

    /**
     * Начало создания соединения
     */
    startConnection(socket, { botId, graphId, fromX, fromY, fromNodeId, fromHandleId }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const userInfo = this.getUserInfo(socket, botId, graphId);

        if (!userInfo) return;

        // Broadcast начало соединения
        socket.to(roomKey).emit('collab:connection-start', {
            socketId: socket.id,
            username: userInfo.username,
            color: userInfo.color,
            fromX,
            fromY,
            fromNodeId,
            fromHandleId,
        });
    }

    /**
     * Обновление позиции соединения во время тяжения
     */
    updateConnection(socket, { botId, graphId, toX, toY }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const userInfo = this.getUserInfo(socket, botId, graphId);

        if (!userInfo) return;

        // Broadcast обновление позиции
        socket.to(roomKey).emit('collab:connection-update', {
            socketId: socket.id,
            toX,
            toY,
        });
    }

    /**
     * Завершение создания соединения
     */
    endConnection(socket, { botId, graphId }) {
        const roomKey = this.getRoomKey(botId, graphId);

        // Broadcast завершение соединения
        socket.to(roomKey).emit('collab:connection-end', {
            socketId: socket.id,
        });
    }

    /**
     * Инициализировать состояние графа (вызывается первым пользователем после загрузки из БД)
     */
    initializeGraphState(socket, { botId, graphId, nodes, edges }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);

        if (!room) return;

        room.graphState = {
            nodes: nodes || [],
            edges: edges || [],
            lastUpdate: Date.now(),
        };

        console.log(`[GraphCollaboration] Graph state initialized for bot ${botId}, graph ${graphId}: ${nodes?.length} nodes, ${edges?.length} edges`);
    }

    /**
     * Broadcast изменения нод (движение, создание, удаление)
     */
    broadcastNodeChange(socket, { botId, graphId, type, data }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);

        if (room) {
            // Обновляем состояние графа в комнате
            switch (type) {
                case 'create':
                    // data = { node }
                    if (data.node) {
                        room.graphState.nodes.push(data.node);
                    }
                    break;
                case 'delete':
                    // data = { nodeIds: [] }
                    if (data.nodeIds && Array.isArray(data.nodeIds)) {
                        room.graphState.nodes = room.graphState.nodes.filter(n => !data.nodeIds.includes(n.id));
                        // Удаляем связанные edges
                        room.graphState.edges = room.graphState.edges.filter(
                            c => !data.nodeIds.includes(c.source) && !data.nodeIds.includes(c.target)
                        );
                    }
                    break;
                case 'update':
                    // data = { nodeId, nodeData }
                    if (data.nodeId && data.nodeData) {
                        const nodeIndex = room.graphState.nodes.findIndex(n => n.id === data.nodeId);
                        if (nodeIndex !== -1) {
                            room.graphState.nodes[nodeIndex].data = {
                                ...room.graphState.nodes[nodeIndex].data,
                                ...data.nodeData
                            };
                        }
                    }
                    break;
                case 'move':
                    // data = [{ id, position }]
                    if (Array.isArray(data)) {
                        data.forEach(change => {
                            const nodeIndex = room.graphState.nodes.findIndex(n => n.id === change.id);
                            if (nodeIndex !== -1) {
                                room.graphState.nodes[nodeIndex].position = change.position;
                            }
                        });
                    }
                    break;
            }
            room.graphState.lastUpdate = Date.now();
        }

        // Отправляем всем кроме отправителя
        socket.to(roomKey).emit('collab:node-changed', {
            type, // 'move' | 'create' | 'delete' | 'update'
            data,
            username: this.getUserInfo(socket, botId, graphId)?.username,
        });
    }

    /**
     * Broadcast изменения связей (создание, удаление)
     */
    broadcastEdgeChange(socket, { botId, graphId, type, data }) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);

        if (room) {
            // Обновляем состояние графа в комнате
            switch (type) {
                case 'create':
                    // data = { edge }
                    if (data.edge) {
                        room.graphState.edges.push(data.edge);
                    }
                    break;
                case 'delete':
                    // data = { edgeIds: [] }
                    if (data.edgeIds && Array.isArray(data.edgeIds)) {
                        room.graphState.edges = room.graphState.edges.filter(
                            c => !data.edgeIds.includes(c.id)
                        );
                    }
                    break;
            }
            room.graphState.lastUpdate = Date.now();
        }

        socket.to(roomKey).emit('collab:edge-changed', {
            type, // 'create' | 'delete'
            data,
            username: this.getUserInfo(socket, botId, graphId)?.username,
        });
    }

    /**
     * Broadcast hot reload графа
     */
    broadcastGraphReloaded(botId, graphId) {
        const roomKey = this.getRoomKey(botId, graphId);

        if (this.io) {
            this.io.to(roomKey).emit('collab:graph-reloaded', {
                botId,
                graphId,
                timestamp: Date.now(),
            });
        }
    }

    /**
     * Получить информацию о пользователе
     */
    getUserInfo(socket, botId, graphId) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);
        return room?.users.get(socket.id);
    }

    /**
     * Получить всех пользователей в комнате
     */
    getRoomUsers(botId, graphId) {
        const roomKey = this.getRoomKey(botId, graphId);
        const room = this.rooms.get(roomKey);

        if (!room) return [];

        return Array.from(room.users.values()).map(u => ({
            socketId: u.socketId,
            username: u.username,
            userId: u.userId,
            color: u.color,
            cursor: u.cursor,
            selectedNodes: u.selectedNodes,
            debugMode: u.debugMode,
        }));
    }

    /**
     * Удалить пользователя из всех комнат (при disconnect)
     */
    removeUserFromAllRooms(socket) {
        for (const [roomKey, room] of this.rooms.entries()) {
            const userInfo = room.users.get(socket.id);
            if (userInfo) {
                room.users.delete(socket.id);

                socket.to(roomKey).emit('collab:user-left', {
                    socketId: socket.id,
                    username: userInfo.username,
                });

                console.log(`[GraphCollaboration] User ${userInfo.username} (${socket.id}) disconnected from room ${roomKey}`);

                if (room.users.size === 0) {
                    this.rooms.delete(roomKey);
                    console.log(`[GraphCollaboration] Removed empty room ${roomKey}`);
                }
            }
        }
    }

    /**
     * Генерация ключа комнаты
     */
    getRoomKey(botId, graphId) {
        return `graph:${botId}:${graphId}`;
    }

    /**
     * Генерация уникального цвета для пользователя
     */
    generateUserColor(socketId) {
        const colors = [
            '#FF6B6B', // Red
            '#4ECDC4', // Cyan
            '#45B7D1', // Blue
            '#FFA07A', // Light Salmon
            '#98D8C8', // Mint
            '#F7DC6F', // Yellow
            '#BB8FCE', // Purple
            '#85C1E2', // Sky Blue
            '#F8B739', // Orange
            '#52C785', // Green
        ];

        // Простой хеш для консистентности цвета
        const hash = socketId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }

    /**
     * Получить статистику
     */
    getStats() {
        const stats = {
            totalRooms: this.rooms.size,
            totalUsers: 0,
            rooms: [],
        };

        for (const [roomKey, room] of this.rooms.entries()) {
            stats.totalUsers += room.users.size;
            stats.rooms.push({
                roomKey,
                botId: room.botId,
                graphId: room.graphId,
                userCount: room.users.size,
                users: Array.from(room.users.values()).map(u => u.username),
            });
        }

        return stats;
    }
}

let globalCollaborationManager = null;

function initializeCollaborationManager(io) {
    if (!globalCollaborationManager) {
        globalCollaborationManager = new GraphCollaborationManager();
        globalCollaborationManager.initialize(io);
    }
    return globalCollaborationManager;
}

function getGlobalCollaborationManager() {
    if (!globalCollaborationManager) {
        throw new Error('GraphCollaborationManager not initialized! Call initializeCollaborationManager(io) first.');
    }
    return globalCollaborationManager;
}

module.exports = {
    GraphCollaborationManager,
    initializeCollaborationManager,
    getGlobalCollaborationManager,
};
