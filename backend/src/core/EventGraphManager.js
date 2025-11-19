const prismaService = require('./PrismaService');
const { safeJsonParse } = require('./utils/jsonParser');
const { parseVariables } = require('./utils/variableParser');
const validationService = require('./services/ValidationService');

const prisma = prismaService.getClient();

class EventGraphManager {
    constructor(botManager = null) {
        this.botManager = botManager;
        this.activeGraphs = new Map();
        this.graphStates = new Map();
    }

    setBotManager(botManager) {
        this.botManager = botManager;
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
                const parsedGraph = validationService.parseGraph(graph.graphJson, `EventGraph ID ${graph.id}`);
                if (!validationService.hasValidBasicStructure(parsedGraph)) continue;

                const initialState = {};
                if (graph.variables) {
                    const parsedVars = safeJsonParse(graph.variables, [], `EventGraph ID ${graph.id} variables`);
                    Object.assign(initialState, parseVariables(parsedVars, `EventGraph ID ${graph.id}`));
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
                await this.executeGraphInChildProcess(botId, eventType, graph, args);
            } catch (error) {
                console.error(`[EventGraphManager] Error sending event to child process for '${eventType}':`, error);
                this.botManager.appendLog(botId, `[ERROR] Error in event graph: ${error.message}`);
            }
        }
    }

    /**
     * Отправляет граф в child process для выполнения
     */
    async executeGraphInChildProcess(botId, eventType, graph, eventArgs) {
        if (!graph || !graph.nodes || graph.nodes.length === 0) return;

        const childProcess = this.botManager.getChildProcess(botId);
        if (!childProcess || !childProcess.send) {
            console.error(`[EventGraphManager] No child process found for bot ${botId}`);
            return;
        }

        childProcess.send({
            type: 'execute_event_graph',
            botId: botId,
            graph: graph,
            eventType: eventType,
            eventArgs: eventArgs
        });
    }

    /**
     * Отправляет события в WebSocket API
     */
    broadcastEventToApi(botId, eventType, args) {
        try {
            // Динамический импорт для избежания циклической зависимости
            const { getIOSafe } = require('../real-time/socketHandler');
            const { broadcastToApiClients } = require('../real-time/botApi');

            const io = getIOSafe();
            if (!io) return;

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
            const { getIOSafe } = require('../real-time/socketHandler');
            const { broadcastToApiClients } = require('../real-time/botApi');

            const io = getIOSafe();
            if (!io) return;

            broadcastToApiClients(io, botId, 'plugin:custom_event', {
                eventName,
                payload,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            // Игнорируем другие ошибки
        }
    }
}

module.exports = EventGraphManager;