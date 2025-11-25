const { v4: uuidv4 } = require('uuid');

class MinecraftViewerService {
    constructor({ io, botProcessManager, logger }) {
        this.processManager = botProcessManager;
        this.logger = logger;
        this.viewerNamespace = io.of('/minecraft-viewer');
        this.activeViewers = new Map(); // botId -> Set<socketId>
        this.pendingRequests = new Map();

        this._setupNamespace();
        this._setupIPCHandlers();
    }

    _setupNamespace() {
        this.viewerNamespace.on('connection', (socket) => {
            this.logger.info(`[MinecraftViewer] Client connected: ${socket.id}`);

            socket.on('viewer:connect', ({ botId }) => {
                const child = this.processManager.getProcess(botId);
                if (!child) {
                    socket.emit('viewer:error', { message: 'Bot not running' });
                    return;
                }

                socket.botId = botId;
                socket.join(`bot:${botId}`);

                if (!this.activeViewers.has(botId)) {
                    this.activeViewers.set(botId, new Set());
                }
                this.activeViewers.get(botId).add(socket.id);

                this.logger.info(`[MinecraftViewer] Socket ${socket.id} connected to bot ${botId}`);

                const requestId = uuidv4();
                this.processManager.sendMessage(botId, {
                    type: 'viewer:get_state',
                    requestId,
                    includeBlocks: true
                });

                this.pendingRequests.set(requestId, {
                    resolve: (state) => {
                        socket.emit('viewer:connected', { botId });
                        socket.emit('viewer:state', state);
                    },
                    reject: (error) => {
                        socket.emit('viewer:error', { message: error.message });
                    }
                });

                this._startStateStream(botId);
            });

            socket.on('viewer:control', ({ command }) => {
                const botId = socket.botId;
                if (!botId) return;

                this.processManager.sendMessage(botId, {
                    type: 'viewer:control',
                    command
                });
            });

            socket.on('viewer:disconnect', () => {
                const botId = socket.botId;
                if (botId) {
                    this._removeViewer(botId, socket.id);
                }
            });

            socket.on('disconnect', () => {
                this.logger.info(`[MinecraftViewer] Client disconnected: ${socket.id}`);
                const botId = socket.botId;
                if (botId) {
                    this._removeViewer(botId, socket.id);
                }
            });
        });
    }

    _setupIPCHandlers() {
        this.processManager.getAllProcesses().forEach((child, botId) => {
            this._attachChildHandlers(child, botId);
        });

        const originalSpawn = this.processManager.spawn.bind(this.processManager);
        this.processManager.spawn = async (...args) => {
            const child = await originalSpawn(...args);
            const botId = child.botConfig.id;
            this._attachChildHandlers(child, botId);
            return child;
        };
    }

    _attachChildHandlers(child, botId) {
        child.on('message', (message) => {
            if (message.type === 'viewer:state_response') {
                const pending = this.pendingRequests.get(message.requestId);
                if (pending) {
                    pending.resolve(message.payload);
                    this.pendingRequests.delete(message.requestId);
                }
            } else if (message.type === 'viewer:spawn') {
                this.viewerNamespace.to(`bot:${botId}`).emit('viewer:spawn', message.payload);
            } else if (message.type === 'viewer:move') {
                this.viewerNamespace.to(`bot:${botId}`).emit('viewer:move', message.payload);
            } else if (message.type === 'viewer:health') {
                this.viewerNamespace.to(`bot:${botId}`).emit('viewer:health', message.payload);
            } else if (message.type === 'viewer:chat') {
                this.viewerNamespace.to(`bot:${botId}`).emit('viewer:chat', message.payload);
            }
        });
    }

    _startStateStream(botId) {
        if (this.activeViewers.get(botId)?.size === 1) {
            let lastPosition = null;
            let lastSentPosition = null;
            let lastSentPlayers = new Map(); // username -> {x, y, z, yaw, pitch}
            let tickCounter = 0;

            const interval = setInterval(() => {
                if (this.activeViewers.get(botId)?.size > 0) {
                    tickCounter++;
                    const shouldSendBlocks = tickCounter % 60 === 0;

                    const requestId = uuidv4();
                    this.processManager.sendMessage(botId, {
                        type: 'viewer:get_state',
                        requestId,
                        includeBlocks: shouldSendBlocks
                    });

                    this.pendingRequests.set(requestId, {
                        resolve: (state) => {
                            const currentPos = state.position;

                            // Проверяем изменения в nearbyPlayers
                            let playersChanged = false;
                            if (state.nearbyPlayers) {
                                // Проверяем количество
                                if (state.nearbyPlayers.length !== lastSentPlayers.size) {
                                    playersChanged = true;
                                } else {
                                    // Проверяем каждого игрока
                                    for (const player of state.nearbyPlayers) {
                                        const last = lastSentPlayers.get(player.username);
                                        if (!last ||
                                            Math.abs(last.x - player.position.x) > 0.1 ||
                                            Math.abs(last.y - player.position.y) > 0.1 ||
                                            Math.abs(last.z - player.position.z) > 0.1 ||
                                            Math.abs(last.yaw - player.yaw) > 0.05 ||
                                            Math.abs(last.pitch - player.pitch) > 0.05) {
                                            playersChanged = true;
                                            break;
                                        }
                                    }
                                }
                            }

                            // Отправляем если позиция бота изменилась, игроки изменились, или пора отправлять блоки
                            const shouldSend = shouldSendBlocks || playersChanged || !lastSentPosition ||
                                Math.abs(currentPos?.x - lastSentPosition.x) > 0.1 ||
                                Math.abs(currentPos?.y - lastSentPosition.y) > 0.1 ||
                                Math.abs(currentPos?.z - lastSentPosition.z) > 0.1;

                            if (shouldSend) {
                                this.viewerNamespace.to(`bot:${botId}`).emit('viewer:update', state);
                                lastSentPosition = currentPos ? { ...currentPos } : null;

                                // Обновляем кэш игроков
                                lastSentPlayers.clear();
                                if (state.nearbyPlayers) {
                                    state.nearbyPlayers.forEach(player => {
                                        lastSentPlayers.set(player.username, {
                                            x: player.position.x,
                                            y: player.position.y,
                                            z: player.position.z,
                                            yaw: player.yaw,
                                            pitch: player.pitch
                                        });
                                    });
                                }
                            }

                            // Обновляем lastPosition для блоков
                            if (shouldSendBlocks || !lastPosition ||
                                Math.abs(currentPos?.x - lastPosition.x) > 8 ||
                                Math.abs(currentPos?.y - lastPosition.y) > 8 ||
                                Math.abs(currentPos?.z - lastPosition.z) > 8) {
                                lastPosition = currentPos ? { ...currentPos } : null;
                            }
                        },
                        reject: () => {}
                    });
                } else {
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    _removeViewer(botId, socketId) {
        const viewers = this.activeViewers.get(botId);
        if (viewers) {
            viewers.delete(socketId);
            if (viewers.size === 0) {
                this.activeViewers.delete(botId);
            }
        }
    }
}

module.exports = MinecraftViewerService;
