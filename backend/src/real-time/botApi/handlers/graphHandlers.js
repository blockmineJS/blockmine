const prisma = require('../../../lib/prisma');
const { botManager } = require('../../../core/services');

/**
 * action:trigger_graph - Запустить визуальный граф
 */
async function handleTriggerGraph(socket, payload) {
    // Проверяем права
    if (socket.permissions === 'Read') {
        return socket.emit('error', {
            action: 'trigger_graph',
            message: 'Insufficient permissions: Read-only key',
        });
    }

    try {
        const { graphName, context = {} } = payload;

        if (!graphName) {
            return socket.emit('error', {
                action: 'trigger_graph',
                message: 'graphName is required',
            });
        }

        // Проверяем, что бот онлайн
        if (!botManager.isBotRunning(socket.botId)) {
            return socket.emit('error', {
                action: 'trigger_graph',
                message: 'Bot is offline',
            });
        }

        // Проверяем, что EventGraphManager инициализирован
        if (!botManager.eventGraphManager) {
            return socket.emit('error', {
                action: 'trigger_graph',
                message: 'Event graph manager not initialized',
            });
        }

        // Получаем граф из базы с триггерами
        const graph = await prisma.eventGraph.findFirst({
            where: {
                botId: socket.botId,
                name: graphName,
                isEnabled: true,
            },
            include: { triggers: true },
        });

        if (!graph) {
            return socket.emit('error', {
                action: 'trigger_graph',
                message: `Graph "${graphName}" not found or disabled`,
            });
        }

        if (!graph.graphJson) {
            return socket.emit('error', {
                action: 'trigger_graph',
                message: `Graph "${graphName}" has no valid graph data`,
            });
        }

        // Парсим граф
        const parsedGraph = JSON.parse(graph.graphJson);

        // Запускаем граф напрямую через executeGraph
        await botManager.eventGraphManager.executeGraph(
            socket.botId,
            'api_trigger', // Тип события
            {
                id: graph.id,
                name: graph.name,
                nodes: parsedGraph.nodes,
                connections: parsedGraph.connections,
                variables: parsedGraph.variables || [],
            },
            context // Передаем context как eventArgs
        );

        socket.emit('action:result', {
            action: 'trigger_graph',
            success: true,
            graphName,
        });
    } catch (error) {
        console.error('[Bot API] Ошибка запуска графа:', error);
        socket.emit('error', {
            action: 'trigger_graph',
            message: 'Internal error',
        });
    }
}

module.exports = {
    handleTriggerGraph,
};
