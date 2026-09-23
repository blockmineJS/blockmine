const prisma = require('../../lib/prisma');
const GraphValidation = require('../GraphValidation');
const { parseVariables } = require('../utils/variableParser');
const { buildTestContext, createEffectRecorder, sanitizeArgs, sanitizeEventArgs, sanitizeTypeChat, sanitizeUsername } = require('./TestModeContext');
const { runInGraphTest } = require('./testModeGuard');

const MAX_NODES = 2000;
const MAX_CONNECTIONS = 4000;

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeGraph(graph) {
    let parsed = graph;
    if (typeof parsed === 'string') {
        if (!parsed || parsed === 'null') {
            throw fail(400, 'В графе нет данных');
        }
        try {
            parsed = JSON.parse(parsed);
        } catch {
            throw fail(400, 'Граф повреждён');
        }
    }

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.nodes)) {
        throw fail(400, 'В графе нет нод');
    }
    if (parsed.nodes.length > MAX_NODES) {
        throw fail(400, 'В графе слишком много нод');
    }

    let connections = parsed.connections;
    if (!Array.isArray(connections) && Array.isArray(parsed.edges)) {
        connections = parsed.edges.map((edge) => ({
            id: edge.id,
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourcePinId: edge.sourceHandle,
            targetPinId: edge.targetHandle,
        }));
    }
    if (!Array.isArray(connections)) connections = [];
    if (connections.length > MAX_CONNECTIONS) {
        throw fail(400, 'В графе слишком много связей');
    }

    return {
        nodes: parsed.nodes.map((node) => ({
            id: String(node.id),
            type: node.type,
            position: {
                x: Number(node.position?.x) || 0,
                y: Number(node.position?.y) || 0,
            },
            data: node.data && typeof node.data === 'object' ? node.data : {},
        })),
        connections: connections
            .filter((conn) => conn && conn.sourceNodeId && conn.targetNodeId && conn.sourcePinId && conn.targetPinId)
            .map((conn) => ({
                id: String(conn.id || `${conn.sourceNodeId}-${conn.targetNodeId}-${conn.targetPinId}`),
                sourceNodeId: String(conn.sourceNodeId),
                targetNodeId: String(conn.targetNodeId),
                sourcePinId: String(conn.sourcePinId),
                targetPinId: String(conn.targetPinId),
            })),
        variables: Array.isArray(parsed.variables) ? parsed.variables : [],
    };
}

async function loadOwnedGraph(kind, botId, graphId) {
    if (!Number.isInteger(botId) || !Number.isInteger(graphId)) {
        throw fail(400, 'Некорректный идентификатор');
    }

    if (kind === 'command') {
        const command = await prisma.command.findFirst({
            where: { id: graphId, botId },
        });
        if (!command || !command.isVisual) {
            throw fail(404, 'Визуальная команда не найдена');
        }
        return { name: command.name, graphJson: command.graphJson };
    }

    const eventGraph = await prisma.eventGraph.findFirst({
        where: { id: graphId, botId },
    });
    if (!eventGraph) {
        throw fail(404, 'Граф события не найден');
    }
    return { name: eventGraph.name, graphJson: eventGraph.graphJson };
}

function resolveGraph(body, storedGraphJson) {
    if (body && body.graph) return normalizeGraph(body.graph);
    return normalizeGraph(storedGraphJson);
}

function buildRunContext({ botId, graphId, kind, body, commandName, recordEffect }) {
    const eventType = kind === 'command' ? 'command' : (body?.eventType || 'chat');
    const eventArgs = kind === 'command' ? {} : sanitizeEventArgs(body?.eventArgs);
    return buildTestContext({
        botId,
        graphId,
        eventType,
        eventArgs,
        args: sanitizeArgs(body?.args),
        username: sanitizeUsername(body?.username),
        typeChat: sanitizeTypeChat(body?.typeChat),
        commandName,
        recordEffect,
    });
}

async function launchGraphTest({ kind, botId, graphId, graph, commandName, body }) {
    const eventType = kind === 'command' ? 'command' : (body?.eventType || 'chat');
    let validation;
    try {
        validation = GraphValidation.validateGraphForExecution(graph, 'GraphTestRunner');
    } catch {
        throw fail(400, 'Граф не прошёл проверку');
    }
    if (validation.shouldSkip) {
        throw fail(400, 'Граф не прошёл проверку');
    }

    const startNode = GraphValidation.findStartNode(validation.graph, eventType);
    if (!startNode) {
        throw fail(400, kind === 'command'
            ? 'В графе нет стартовой ноды команды'
            : 'В графе нет стартовой ноды события');
    }

    const { getGlobalDebugManager } = require('./DebugSessionManager');
    const debugState = getGlobalDebugManager().getOrCreate(botId, graphId);
    debugState.enableTestMode({ botId, graphId, eventType });

    const { recordEffect } = createEffectRecorder(graphId);
    const context = buildRunContext({
        botId,
        graphId,
        kind,
        body,
        commandName,
        recordEffect,
    });

    const nodeRegistry = require('../NodeRegistry');
    const GraphExecutionEngine = require('../GraphExecutionEngine');
    const engine = new GraphExecutionEngine(nodeRegistry, null);

    setImmediate(() => {
        runInGraphTest(() => engine.execute(validation.graph, context, eventType))
            .catch((err) => {
                if (!err) return;
                if (err.name === 'BreakLoopSignal') return;
                if (err.message === 'Execution stopped by debugger') return;
                console.error('[Test Run] Execution error:', err.message);
            })
            .finally(() => {
                try {
                    debugState.broadcast('debug:test-finished', {});
                } catch {
                }
            });
    });

    return { success: true, message: 'Test run started in step mode' };
}

async function startOwnedTest({ kind, botId, graphId, body }) {
    const owned = await loadOwnedGraph(kind, botId, graphId);
    const graph = resolveGraph(body, owned.graphJson);
    return launchGraphTest({
        kind,
        botId,
        graphId,
        graph,
        commandName: owned.name,
        body,
    });
}

async function runOwnedNode({ kind, botId, graphId, nodeId, body }) {
    const owned = await loadOwnedGraph(kind, botId, graphId);
    const graph = resolveGraph(body, owned.graphJson);
    const requestedId = nodeId || body?.node?.id;
    const fromBody = body?.node && String(body.node.id) === String(requestedId) ? body.node : null;
    const stored = graph.nodes.find((node) => node.id === String(requestedId));
    const node = fromBody
        ? {
            id: String(fromBody.id),
            type: fromBody.type,
            position: stored?.position || { x: 0, y: 0 },
            data: fromBody.data && typeof fromBody.data === 'object' ? fromBody.data : {},
        }
        : stored;

    if (!node) {
        throw fail(404, 'Нода не найдена в графе');
    }

    const nodeRegistry = require('../NodeRegistry');
    const nodeConfig = nodeRegistry.getNodeConfig(node.type);
    if (!nodeConfig) {
        throw fail(400, `Неизвестный тип ноды: ${node.type}`);
    }

    const { recordEffect, effects } = createEffectRecorder(graphId, { broadcast: false });
    const GraphExecutionEngine = require('../GraphExecutionEngine');
    const engine = new GraphExecutionEngine(nodeRegistry, null);
    const inputs = body?.inputs && typeof body.inputs === 'object' ? body.inputs : {};
    const variablesInput = body?.variables;

    engine.activeGraph = graph;
    engine.context = {
        ...buildRunContext({
            botId,
            graphId,
            kind,
            body,
            commandName: owned.name,
            recordEffect,
        }),
        variables: Array.isArray(variablesInput)
            ? parseVariables(variablesInput, 'runNode')
            : (variablesInput || {}),
    };
    engine.traversal = {
        findIncomingConnection: () => null,
        getNode: (id) => graph.nodes.find((item) => item.id === id) || null,
        hasConnection: () => false,
    };

    for (const [pin, value] of Object.entries(inputs)) {
        engine.memo.set(`__forced:${node.id}:${pin}`, value);
    }
    const originalResolve = engine.resolvePinValue.bind(engine);
    engine.resolvePinValue = async function (targetNode, pinName, defaultValue) {
        if (targetNode.id === node.id && engine.memo.has(`__forced:${node.id}:${pinName}`)) {
            return engine.memo.get(`__forced:${node.id}:${pinName}`);
        }
        return originalResolve(targetNode, pinName, defaultValue);
    };

    const startedAt = Date.now();
    const helpers = {
        resolvePinValue: engine.resolvePinValue.bind(engine),
        traverse: async () => {},
        memo: engine.memo,
        clearLoopBodyMemo: () => {},
    };

    let outputs = {};
    let errorMsg = null;
    try {
        await runInGraphTest(async () => {
            if (typeof nodeConfig.executor === 'function') {
                await nodeConfig.executor.call(engine, node, engine.context, helpers);
            }
            outputs = await engine._captureNodeOutputs(node);
        });
    } catch (error) {
        errorMsg = error.message;
    }

    return {
        success: !errorMsg,
        nodeId: node.id,
        nodeType: node.type,
        executionTime: Date.now() - startedAt,
        outputs,
        error: errorMsg,
        variables: engine.context.variables,
        effects,
    };
}

module.exports = {
    normalizeGraph,
    launchGraphTest,
    startOwnedTest,
    runOwnedNode,
};
