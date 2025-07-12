const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class EventGraphManager {
    constructor(botManager) {
        this.botManager = botManager;
        this.graphEngine = botManager.graphEngine;
        this.activeGraphs = new Map();
        // Хранилище для состояний (переменных) каждого графа
        this.graphStates = new Map();
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

                // Инициализация начального состояния переменных для этого графа
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
        // Также очищаем состояния при выгрузке
        for (const key of this.graphStates.keys()) {
            if (key.startsWith(`${botId}-`)) {
                this.graphStates.delete(key);
            }
        }
        console.log(`[EventGraphs] Графы и их состояния для бота ${botId} выгружены.`);
    }

    async handleEvent(botId, eventType, args) {
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
        };
        
        const stateKey = `${botId}-${graph.id}`;

        const initialContext = this.getInitialContextForEvent(eventType, eventArgs);
        initialContext.bot = botApi;
        initialContext.botId = botId;
        initialContext.players = players;
        initialContext.botState = eventArgs.botState || {};
        initialContext.variables = { ...(this.graphStates.get(stateKey) || {}) };

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
            case 'tick':
                break;
            case 'entitySpawn':
            case 'entityMoved':
            case 'entityGone':
                context.entity = args.entity;
                break;
        }
        return context;
    }
}

module.exports = EventGraphManager;