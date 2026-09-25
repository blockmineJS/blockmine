const { randomUUID } = require('crypto');
const prisma = require('../../lib/prisma');
const GraphValidation = require('../GraphValidation');
const { parseVariables } = require('../utils/variableParser');
const { buildTestContext, createEffectRecorder, sanitizeArgs, sanitizeEventArgs, sanitizeTypeChat, sanitizeUsername } = require('./TestModeContext');
const { runInGraphTest } = require('./testModeGuard');
const { checkCommandAccess, parseStringList } = require('../commandGate');

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
        const permission = command.permissionId
            ? await prisma.permission.findUnique({ where: { id: command.permissionId }, select: { name: true } })
            : null;
        const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { prefix: true } });
        return {
            name: command.name,
            graphJson: command.graphJson,
            isEnabled: command.isEnabled,
            allowedChatTypes: command.allowedChatTypes,
            argumentsJson: command.argumentsJson,
            cooldown: command.cooldown,
            permissionName: permission?.name || null,
            prefix: bot?.prefix || '@',
            testsJson: command.testsJson,
        };
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
        world: body?.world && typeof body.world === 'object' ? body.world : {},
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
    const nodeRegistry = require('../NodeRegistry');
    const GraphExecutionEngine = require('../GraphExecutionEngine');
    const engine = new GraphExecutionEngine(nodeRegistry, null);
    const interactive = body?.interactive !== false;

    if (!interactive) {
        try {
            const existing = getGlobalDebugManager().get(graphId);
            if (existing) {
                existing.testMode = false;
                existing.stepMode = false;
                existing.runToEnd = true;
            }
        } catch {
        }
        const { recordEffect, effects } = createEffectRecorder(graphId, { broadcast: false });
        const context = buildRunContext({ botId, graphId, kind, body, commandName, recordEffect });
        await runInGraphTest(() => engine.execute(validation.graph, context, eventType));
        return { success: true, blocked: false, effects };
    }

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

    return { success: true, blocked: false, message: 'Test run started in step mode' };
}

function gateEffects(gate) {
    const effects = [];
    if (gate.reason === 'disabled' || gate.reason === 'chat') {
        const gateSummary = gate.reason === 'disabled'
            ? 'Команда выключена'
            : 'Этот тип чата для команды не разрешён';
        effects.push({
            id: randomUUID(),
            at: Date.now(),
            kind: 'gate',
            reason: gate.reason,
            summary: gateSummary,
        });
    }
    for (const message of gate.messages || []) {
        effects.push({
            id: randomUUID(),
            at: Date.now(),
            kind: 'message',
            chatType: message.typeChat,
            message: message.message,
            username: null,
        });
    }
    return effects;
}

function accessFromBody(owned, body) {
    const argumentsDef = Array.isArray(body?.argumentsDef)
        ? body.argumentsDef
        : parseStringList(owned.argumentsJson, []);
    const allowedChatTypes = body?.allowedChatTypes !== undefined
        ? body.allowedChatTypes
        : parseStringList(owned.allowedChatTypes, ['chat', 'private']);
    return checkCommandAccess({
        commandName: owned.name,
        prefix: owned.prefix || '@',
        isEnabled: body?.isEnabled !== undefined ? Boolean(body.isEnabled) : owned.isEnabled !== false,
        allowedChatTypes,
        argumentsDef,
        args: sanitizeArgs(body?.args),
        typeChat: sanitizeTypeChat(body?.typeChat),
        permissionName: body?.permissionName !== undefined ? (body.permissionName || null) : owned.permissionName,
        cooldown: body?.cooldown !== undefined ? Number(body.cooldown) || 0 : Number(owned.cooldown) || 0,
        asOwner: Boolean(body?.asOwner),
        permissions: Array.isArray(body?.permissions) ? body.permissions : [],
        cooldownLeft: Number(body?.cooldownLeft) || 0,
    });
}

function effectText(effect) {
    if (!effect) return '';
    if (effect.kind === 'message') return String(effect.message || '');
    if (effect.kind === 'log' || effect.kind === 'chat') return String(effect.message || '');
    return String(effect.summary || effect.message || '');
}

async function startOwnedTest({ kind, botId, graphId, body }) {
    const owned = await loadOwnedGraph(kind, botId, graphId);
    if (kind === 'command') {
        const gate = accessFromBody(owned, body);
        if (!gate.allowed) {
            const effects = gateEffects(gate);
            try {
                const { getGlobalDebugManager } = require('./DebugSessionManager');
                const debugState = getGlobalDebugManager().get(graphId);
                effects.forEach((effect) => debugState?.broadcast('debug:test-effect', { effect }));
            } catch {
            }
            return { success: true, blocked: true, reason: gate.reason, effects };
        }
    }
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

function sanitizeStoredTests(value) {
    const list = parseStringList(value, Array.isArray(value) ? value : []);
    if (!Array.isArray(list)) return [];
    return list.slice(0, 30).map((test) => ({
        id: String(test?.id || randomUUID()).slice(0, 64),
        name: String(test?.name || 'Проверка').slice(0, 80),
        username: sanitizeUsername(test?.username),
        typeChat: sanitizeTypeChat(test?.typeChat),
        asOwner: Boolean(test?.asOwner),
        permissions: Array.isArray(test?.permissions)
            ? test.permissions.map((item) => String(item).slice(0, 80)).slice(0, 32)
            : [],
        args: sanitizeArgs(test?.args),
        world: {
            players: Array.isArray(test?.world?.players)
                ? test.world.players.map((item) => String(item).slice(0, 32)).filter(Boolean).slice(0, 32)
                : [],
            inventory: Array.isArray(test?.world?.inventory)
                ? test.world.inventory.map((item) => String(item).slice(0, 64)).filter(Boolean).slice(0, 64)
                : [],
        },
        cooldownLeft: Math.max(0, Number(test?.cooldownLeft) || 0),
        expect: Array.isArray(test?.expect)
            ? test.expect.map((line) => String(line).slice(0, 200)).filter(Boolean).slice(0, 20)
            : [],
    }));
}

async function runCommandSuite({ botId, graphId, body }) {
    const owned = await loadOwnedGraph('command', botId, graphId);
    const tests = sanitizeStoredTests(Array.isArray(body?.tests) ? body.tests : owned.testsJson);
    const results = [];
    for (const test of tests) {
        try {
            const outcome = await startOwnedTest({
                kind: 'command',
                botId,
                graphId,
                body: {
                    ...(body || {}),
                    ...test,
                    interactive: false,
                    eventType: 'command',
                },
            });
            const texts = (outcome.effects || []).map(effectText);
            const missing = test.expect.filter((line) => !texts.some((text) => text.includes(line)));
            results.push({
                id: test.id,
                name: test.name,
                ok: missing.length === 0 && !outcome.error,
                blocked: Boolean(outcome.blocked),
                reason: outcome.reason || null,
                missing,
                effects: outcome.effects || [],
            });
        } catch (error) {
            results.push({
                id: test.id,
                name: test.name,
                ok: false,
                blocked: false,
                reason: 'error',
                missing: [error.message],
                effects: [],
            });
        }
    }
    return { results };
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
    runCommandSuite,
    sanitizeStoredTests,
};
