const { PrismaClient } = require('@prisma/client');
const GraphExecutionEngine = require('./GraphExecutionEngine');
const nodeRegistry = require('./NodeRegistry');

const prisma = new PrismaClient();

class EventGraphManager {
    constructor(botManager = null) {
        this.botManager = botManager;
        this.graphEngine = botManager ? new GraphExecutionEngine(nodeRegistry, botManager) : null;
        this.activeGraphs = new Map();
        this.graphStates = new Map();
    }

    // Setter для установки botManager после создания (решение circular dependency)
    setBotManager(botManager) {
        this.botManager = botManager;
        if (!this.graphEngine) {
            this.graphEngine = new GraphExecutionEngine(nodeRegistry, botManager);
        }
    }

    async loadGraphsForBot(botId) {
        console.log(`[EventGraphs] Загрузка графов для бота ${botId}...`);
        const botGraphs = await prisma.eventGraph.findMany({
            where: { botId, isEnabled: true },
            include: { triggers: true },
        });

        const graphsByEvent = new Map();
        for (const graph of botGraphs) {
            if (!graph.triggers || graph.triggers.length === 0 || !graph.graphJson) continue;

            try {
                const parsedGraph = JSON.parse(graph.graphJson);
                if (!parsedGraph.nodes) continue;

                const initialState = {};
                if (graph.variables) {
                    try {
                        const parsedVars = JSON.parse(graph.variables);
                        for (const v of parsedVars) {
                            let val;
                            switch (v.type) {
                                case 'number': val = Number(v.value) || 0; break;
                                case 'boolean': val = v.value === 'true'; break;
                                case 'array': try { val = Array.isArray(JSON.parse(v.value)) ? JSON.parse(v.value) : []; } catch { val = []; } break;
                                default: val = v.value;
                            }
                            initialState[v.name] = val;
                        }
                    } catch (e) {
                        console.error(`[EventGraphs] Ошибка парсинга переменных графа ID ${graph.id}:`, e);
                    }
                }
                this.graphStates.set(`${botId}-${graph.id}`, initialState);

                for (const trigger of graph.triggers) {
                    if (!graphsByEvent.has(trigger.eventType)) {
                        graphsByEvent.set(trigger.eventType, []);
                    }
                    graphsByEvent.get(trigger.eventType).push({
                        id: graph.id,
                        name: graph.name,
                        nodes: parsedGraph.nodes,
                        connections: parsedGraph.connections,
                        variables: parsedGraph.variables || [],
                    });
                }
            } catch (e) {
                console.error(`[EventGraphs] Ошибка парсинга JSON для графа ID ${graph.id}:`, e);
            }
        }

        this.activeGraphs.set(botId, graphsByEvent);
        console.log(`[EventGraphs] Загружено ${botGraphs.length} графов, сгруппировано по ${graphsByEvent.size} событиям для бота ${botId}.`);
    }

    unloadGraphsForBot(botId) {
        this.activeGraphs.delete(botId);
        for (const key of this.graphStates.keys()) {
            if (key.startsWith(`${botId}-`)) {
                this.graphStates.delete(key);
            }
        }
        console.log(`[EventGraphs] Графы и их состояния для бота ${botId} выгружены.`);
    }

    async handleEvent(botId, eventType, args) {
        this.broadcastEventToApi(botId, eventType, args);

        const graphsForBot = this.activeGraphs.get(botId);
        if (!graphsForBot) return;

        const graphsToRun = graphsForBot.get(eventType);
        if (!graphsToRun || graphsToRun.length === 0) return;

        for (const graph of graphsToRun) {
            try {
                await this.executeGraph(botId, eventType, graph, args);
            } catch (error) {
                console.error(`[EventGraphManager] Uncaught error during graph execution for event '${eventType}':`, error);
                this.botManager.appendLog(botId, `[ERROR] Uncaught error in graph execution: ${error.message}`);
            }
        }
    }

    async executeGraph(botId, eventType, graph, eventArgs) {
        if (!graph || !graph.nodes || graph.nodes.length === 0) return;

        const players = await this.botManager.getPlayerList(botId);

        const botApi = {
            sendMessage: (chatType, message, recipient) => {
                this.botManager.sendMessageToBot(botId, message, chatType, recipient);
            },
            executeCommand: (command) => {
                this.botManager.sendMessageToBot(botId, command, 'command');
            },
            lookAt: (position) => {
                this.botManager.lookAt(botId, position);
            },
            getPlayerList: () => players,
            getNearbyEntities: (position = null, radius = 32) => {
                return this.botManager.getNearbyEntities(botId, position, radius);
            },
            sendLog: (message) => {
                this.botManager.appendLog(botId, message);
            },
            entity: eventArgs.botEntity || null,
            api: {
                emitApiEvent: (eventName, payload) => {
                    this.emitCustomApiEvent(botId, eventName, payload);
                },
            },
        };
        
        const stateKey = `${botId}-${graph.id}`;

        const initialContext = this.getInitialContextForEvent(eventType, eventArgs);
        initialContext.bot = botApi;
        initialContext.botId = botId;
        initialContext.players = players;
        initialContext.botState = eventArgs.botState || {};
        
        const savedVariables = { ...(this.graphStates.get(stateKey) || {}) };
        
        if (graph.variables && Array.isArray(graph.variables)) {
            for (const v of graph.variables) {
                if (!savedVariables.hasOwnProperty(v.name)) {
                    let val;
                    switch (v.type) {
                        case 'number': val = Number(v.value) || 0; break;
                        case 'boolean': val = v.value === 'true'; break;
                        case 'array': try { val = Array.isArray(JSON.parse(v.value)) ? JSON.parse(v.value) : []; } catch { val = []; } break;
                        default: val = v.value;
                    }
                    savedVariables[v.name] = val;
                }
            }
        }
        
        initialContext.variables = savedVariables;

        try {
            const finalContext = await this.graphEngine.execute(graph, initialContext, eventType);

            if (finalContext && finalContext.variables) {
                this.graphStates.set(stateKey, finalContext.variables);
            }
        } catch (error) {
            console.error(`[EventGraphManager] Error during execution or saving state for graph '${graph.name}'`, error);
        }
    }

    getInitialContextForEvent(eventType, args) {
        const context = {};
        switch (eventType) {
            case 'chat':
            case 'private':
            case 'global':
            case 'clan':
                context.user = { username: args.username };
                context.username = args.username;
                context.message = args.message;
                context.chat_type = args.chatType;
                break;
            case 'raw_message':
                context.rawText = args.rawText;
                break;
            case 'playerJoined':
            case 'playerLeft':
                context.user = args.user;
                break;
            case 'botDied':
                context.user = args.user;
                break;
            case 'health':
                context.health = args.health;
                context.food = args.food;
                context.saturation = args.saturation;
                break;
            case 'tick':
                break;
            case 'entitySpawn':
            case 'entityMoved':
            case 'entityGone':
                context.entity = args.entity;
                break;
            case 'command':
                context.command_name = args.commandName;
                context.user = args.user;
                context.args = args.args;
                context.chat_type = args.typeChat;
                context.success = args.success !== undefined ? args.success : true;
                break;
            case 'websocket_call':
                context.graphName = args.graphName;
                context.data = args.data || {};
                context.socketId = args.socketId;
                context.keyPrefix = args.keyPrefix;
                context.sendResponse = args.sendResponse;
                break;
        }
        return context;
    }

    /**
     * Отправляет события в WebSocket API
     */
    broadcastEventToApi(botId, eventType, args) {
        try {
            // Динамический импорт для избежания циклической зависимости
            const { getIO } = require('../real-time/socketHandler');
            const { broadcastToApiClients } = require('../real-time/botApi');

            const io = getIO();

            switch (eventType) {
                case 'chat':
                case 'private':
                case 'global':
                case 'clan':
                    broadcastToApiClients(io, botId, 'chat:message', {
                        type: eventType,
                        username: args.username,
                        message: args.message,
                        raw_message: args.rawText || args.raw_message,
                    });
                    break;

                case 'playerJoined':
                    broadcastToApiClients(io, botId, 'player:join', {
                        username: args.user?.username || args.username,
                    });
                    break;

                case 'playerLeft':
                    broadcastToApiClients(io, botId, 'player:leave', {
                        username: args.user?.username || args.username,
                    });
                    break;

                case 'health':
                    broadcastToApiClients(io, botId, 'bot:health', {
                        health: args.health,
                        food: args.food,
                    });
                    break;

                case 'death':
                    broadcastToApiClients(io, botId, 'bot:death', {});
                    break;
            }
        } catch (error) {
        }
    }

    /**
     * Отправляет кастомное событие от плагина в WebSocket API
     */
    emitCustomApiEvent(botId, eventName, payload = {}) {
        try {
            const { getIO } = require('../real-time/socketHandler');
            const { broadcastToApiClients } = require('../real-time/botApi');

            const io = getIO();
            broadcastToApiClients(io, botId, 'plugin:custom_event', {
                eventName,
                payload,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            // Игнорируем ошибки - Socket.IO может быть еще не инициализирован
        }
    }
}

module.exports = EventGraphManager;