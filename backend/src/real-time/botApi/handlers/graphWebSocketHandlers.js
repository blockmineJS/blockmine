const prisma = require('../../../lib/prisma');
const { botManager } = require('../../../core/services');

/**
 * action:call_graph - Вызвать граф и получить ответ
 * Граф получит событие websocket_call и сможет отправить ответ
 */
async function handleCallGraph(socket, payload) {
    if (socket.permissions === 'Read') {
        return socket.emit('error', {
            action: 'call_graph',
            message: 'Insufficient permissions: Read-only key',
        });
    }

    try {
        const { graphName, data = {} } = payload;

        if (!graphName) {
            return socket.emit('error', {
                action: 'call_graph',
                message: 'graphName is required',
            });
        }

        if (!botManager.isBotRunning(socket.botId)) {
            return socket.emit('error', {
                action: 'call_graph',
                message: 'Bot is offline',
            });
        }

        if (!botManager.eventGraphManager) {
            return socket.emit('error', {
                action: 'call_graph',
                message: 'Event graph manager not initialized',
            });
        }

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
                action: 'call_graph',
                message: `Graph "${graphName}" not found or disabled`,
            });
        }


        const hasWebSocketTrigger = graph.triggers?.some(t => t.eventType === 'websocket_call');
        if (!hasWebSocketTrigger) {
            return socket.emit('error', {
                action: 'call_graph',
                message: `Graph "${graphName}" does not have "WebSocket API Call" trigger`,
            });
        }

        if (!graph.graphJson) {
            return socket.emit('error', {
                action: 'call_graph',
                message: `Graph "${graphName}" has no valid graph data`,
            });
        }

        const parsedGraph = JSON.parse(graph.graphJson);

        let responseSent = false;
        const sendResponse = (responseData) => {
            if (responseSent) return;
            responseSent = true;

            socket.emit('action:result', {
                action: 'call_graph',
                success: true,
                graphName,
                response: responseData,
            });
        };


        const timeout = setTimeout(() => {
            if (!responseSent) {
                responseSent = true;
                socket.emit('error', {
                    action: 'call_graph',
                    message: 'Graph execution timeout (no response sent)',
                });
            }
        }, 30000);

        try {
            await botManager.eventGraphManager.executeGraph(
                socket.botId,
                'websocket_call',
                {
                    id: graph.id,
                    name: graph.name,
                    nodes: parsedGraph.nodes,
                    connections: parsedGraph.connections,
                    variables: parsedGraph.variables || [],
                },
                {
                    graphName,
                    data,
                    socketId: socket.id,
                    keyPrefix: socket.keyPrefix,
                    // Callback для отправки ответа
                    sendResponse: (responseData) => {
                        clearTimeout(timeout);
                        sendResponse(responseData);
                    },
                }
            );

            // Если граф завершился без отправки ответа, отправляем успех
            clearTimeout(timeout);
            if (!responseSent) {
                sendResponse({ completed: true });
            }
        } catch (error) {
            clearTimeout(timeout);
            if (!responseSent) {
                socket.emit('error', {
                    action: 'call_graph',
                    message: error.message || 'Graph execution error',
                });
            }
        }
    } catch (error) {
        console.error('[Bot API] Ошибка вызова графа:', error);
        socket.emit('error', {
            action: 'call_graph',
            message: 'Internal error',
        });
    }
}

module.exports = {
    handleCallGraph,
};
