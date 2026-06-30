const { parseVariables } = require('./utils/variableParser');
const GraphValidation = require('./GraphValidation');
const GraphDebugHandler = require('./GraphDebugHandler');
const GraphTraversal = require('./GraphTraversal');
const { buildGraphIndices } = require('./GraphTraversal');
const { attachDebugIpcHandler } = require('./GraphDebugIPC');
const { getTraceCollector } = require('./services/TraceCollectorService');
const { getGlobalDebugManager } = require('./services/DebugSessionManager');
const { MessageTypes } = require('./ipc/ipcMessageTypes');
const RewindSignal = require('./RewindSignal');
const BreakLoopSignal = require('./BreakLoopSignal');

const MAX_REWINDS = 100;
const PIN_TYPE_EXEC = 'Exec';
const MAX_NODE_EXECUTIONS = 50000;
const MAX_EXECUTION_MS = 30000;

class GraphExecutionEngine {
    constructor(nodeRegistry, botManagerOrApi = null) {
        if (!nodeRegistry || typeof nodeRegistry.getNodeConfig !== 'function') {
            throw new Error('GraphExecutionEngine requires a valid NodeRegistry instance.');
        }
        this.nodeRegistry = nodeRegistry;
        this.botManager = botManagerOrApi;
        this.activeGraph = null;
        this.context = null;
        this.memo = new Map();
        this.traceCollector = getTraceCollector();
        this.currentTraceId = null;
        this.debugHandler = null;
        this.traversal = null;
        this.volatileNodeIds = new Set();
    }

    async execute(graph, context, eventType) {
        const validation = GraphValidation.validateGraphForExecution(graph, 'GraphExecutionEngine.execute');
        if (validation.shouldSkip) {
            return context;
        }

        const parsedGraph = buildGraphIndices(validation.graph);
        const graphId = context.graphId || null;
        const botId = context.botId || null;

        if (graphId && botId) {
            this.currentTraceId = await this.traceCollector.startTrace(
                botId, graphId, eventType || 'command', context.eventArgs || {}
            );
        }

        try {
            this.activeGraph = parsedGraph;
            this.context = context;
            this.traversal = new GraphTraversal(this.activeGraph, this.memo);
            this._precomputeVolatility();

            if (!this.context.variables) {
                this.context.variables = parseVariables(this.activeGraph.variables, 'GraphExecutionEngine');
            }

            if (!this.context.persistenceIntent) {
                this.context.persistenceIntent = new Map();
            }

            this.debugHandler = new GraphDebugHandler(this.context);

            this._stepCount = 0;
            this._deadline = Date.now() + MAX_EXECUTION_MS;

            let rewindAttempts = 0;

            while (true) {
                this.memo.clear();

                await this._applyReplayState(graphId);

                const startNode = GraphValidation.findStartNode(this.activeGraph, eventType);
                if (!startNode) {
                    if (!eventType) {
                        throw new Error('Не найдена стартовая нода события (event:command) в графе.');
                    }
                    break;
                }

                if (this.currentTraceId) {
                    this.traceCollector.recordStep(this.currentTraceId, {
                        nodeId: startNode.id,
                        nodeType: startNode.type,
                        status: 'executed',
                        duration: 0,
                        inputs: {},
                        outputs: await this._captureNodeOutputs(startNode),
                    });
                }

                try {
                    await this.traverse(startNode, 'exec');
                    break;
                } catch (err) {
                    if (err instanceof RewindSignal) {
                        rewindAttempts++;
                        if (rewindAttempts > MAX_REWINDS) {
                            console.error('[Debug] Too many rewinds, aborting');
                            break;
                        }
                        console.log(`[Debug] Rewind requested, restarting graph (attempt ${rewindAttempts})`);

                        if (this.currentTraceId && graphId && botId) {
                            try {
                                await this.traceCollector.completeTrace(this.currentTraceId);
                            } catch {}
                            this.currentTraceId = await this.traceCollector.startTrace(
                                botId, graphId, eventType || 'command', context.eventArgs || {}
                            );
                        }
                        continue;
                    }
                    throw err;
                }
            }

            await this._finalizeTrace(graphId);
        } catch (error) {
            await this._handleExecutionError(error, graphId);
        }

        return this.context;
    }

    _precomputeVolatility() {
        this.volatileNodeIds = new Set();
        if (!this.activeGraph?.nodes) return;
        for (const node of this.activeGraph.nodes) {
            if (GraphDebugHandler.isVolatileNodeType(node.type)) {
                this.volatileNodeIds.add(node.id);
            }
        }
        const propagate = () => {
            let changed = false;
            for (const node of this.activeGraph.nodes) {
                if (this.volatileNodeIds.has(node.id)) continue;
                const incoming = this.activeGraph.connectionsByTarget?.get(node.id) || [];
                for (const conn of incoming) {
                    if (this.volatileNodeIds.has(conn.sourceNodeId)) {
                        this.volatileNodeIds.add(node.id);
                        changed = true;
                        break;
                    }
                }
            }
            return changed;
        };
        while (propagate()) {}
    }

    _isVolatile(node) {
        if (!node) return false;
        return this.volatileNodeIds.has(node.id);
    }

    async _applyReplayState(graphId) {
        if (!graphId) return;

        try {
            const debugManager = getGlobalDebugManager();
            const debugState = debugManager.get(graphId);
            if (debugState && debugState.replayState) {
                if (debugState.replayState.variables) {
                    this.context.variables = JSON.parse(JSON.stringify(debugState.replayState.variables));
                }
                if (debugState.replayState.commandArguments) {
                    this.context.commandArguments = JSON.parse(JSON.stringify(debugState.replayState.commandArguments));
                }
            }
        } catch {}
    }

    _sendTraceToParent(trace) {
        if (!trace || !process.send) return;
        process.send({
            type: MessageTypes.GRAPH.TRACE_COMPLETED,
            trace: {
                ...trace,
                steps: trace.steps,
                eventArgs: typeof trace.eventArgs === 'string' ? trace.eventArgs : JSON.stringify(trace.eventArgs),
            },
        });
    }

    async _finalizeTrace(graphId) {
        if (!this.currentTraceId) return;

        await this._captureAllDataNodeOutputs();

        const trace = await this.traceCollector.completeTrace(this.currentTraceId);
        this._sendTraceToParent(trace);

        if (graphId) {
            try {
                const debugManager = getGlobalDebugManager();
                const debugState = debugManager.get(graphId);
                if (debugState && debugState.activeExecution) {
                    debugState.broadcast('debug:completed', {
                        trace: await this.traceCollector.getTrace(this.currentTraceId),
                    });
                }
            } catch {}
        }

        this.currentTraceId = null;
    }

    async _handleExecutionError(error, graphId) {
        if (this.currentTraceId) {
            try {
                await this._captureAllDataNodeOutputs();
            } catch (captureError) {
                console.error('[GraphExecutor] Error capturing outputs on failure:', captureError);
            }

            const trace = await this.traceCollector.failTrace(this.currentTraceId, error);
            this._sendTraceToParent(trace);
            this.currentTraceId = null;
        }

        const isStoppedByDebugger = error?.message === 'Execution stopped by debugger';
        if (!(error instanceof BreakLoopSignal) && !isStoppedByDebugger) {
            console.error(`[GraphExecutionEngine] Критическая ошибка выполнения графа: ${error.stack}`);
        } else if (isStoppedByDebugger) {
            console.log('[GraphExecutionEngine] Execution stopped by user from debugger');
        }
    }

    async traverse(node, fromPinId) {
        const connection = this.traversal.findConnection(node.id, fromPinId);
        if (!connection) return;

        const nextNode = this.traversal.findNextNode(connection);
        if (!nextNode) return;

        if (this.currentTraceId) {
            this.traceCollector.recordTraversal(this.currentTraceId, node.id, fromPinId, nextNode.id);
        }

        await this.executeNode(nextNode);
    }

    async executeNode(node) {
        const execCacheKey = `${node.id}_executed`;
        if (this.memo.has(execCacheKey)) return;
        this.memo.set(execCacheKey, true);

        this._stepCount = (this._stepCount || 0) + 1;
        if (this._stepCount > MAX_NODE_EXECUTIONS) {
            throw new Error(`Превышен лимит выполнения графа (${MAX_NODE_EXECUTIONS} нод).`);
        }
        if (this._deadline && Date.now() > this._deadline) {
            throw new Error('Превышено максимальное время выполнения графа.');
        }

        const startTime = Date.now();

        if (this.currentTraceId) {
            this.traceCollector.recordStep(this.currentTraceId, {
                nodeId: node.id,
                nodeType: node.type,
                status: 'executed',
                duration: null,
                inputs: await this._captureNodeInputs(node),
                outputs: {},
            });
        }

        if (this.debugHandler) {
            await this.debugHandler.checkBreakpoint(
                node,
                this._captureNodeInputs.bind(this),
                this._captureNodeOutputs.bind(this),
                this.currentTraceId, this.traceCollector
            );

            await this.debugHandler.checkStepMode(
                node,
                this._captureNodeInputs.bind(this),
                this.currentTraceId, this.traceCollector
            );
        }

        const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
        try {
            if (nodeConfig && typeof nodeConfig.executor === 'function') {
                const helpers = {
                    resolvePinValue: this.resolvePinValue.bind(this),
                    traverse: this.traverse.bind(this),
                    memo: this.memo,
                    clearLoopBodyMemo: this.clearLoopBodyMemo.bind(this),
                };

                await nodeConfig.executor.call(this, node, this.context, helpers);
            } else {
                await this._executeLegacyNode(node);
            }

            const executionTime = Date.now() - startTime;
            if (this.currentTraceId) {
                this.traceCollector.updateStepOutputs(this.currentTraceId, node.id, await this._captureNodeOutputs(node));
                this.traceCollector.updateStepDuration(this.currentTraceId, node.id, executionTime);
            }
        } catch (error) {
            if (this.currentTraceId) {
                this.traceCollector.updateStepError(this.currentTraceId, node.id, error.message, Date.now() - startTime);
            }
            throw error;
        }
    }

    async _executeLegacyNode(node) {
        const legacyMap = {
            'string:contains': 'exec', 'string:matches': 'exec', 'string:equals': 'exec',
            'array:get_random_element': 'element',
            'array:add_element': 'result', 'array:remove_by_index': 'result',
            'array:get_by_index': 'result', 'array:find_index': 'result', 'array:contains': 'result',
            'data:array_literal': 'value', 'data:make_object': 'value', 'data:get_variable': 'value',
            'data:get_argument': 'value', 'data:length': 'value', 'data:get_entity_field': 'value',
            'data:cast': 'value', 'data:string_literal': 'value', 'data:get_user_field': 'value',
            'data:get_server_players': 'value', 'data:get_bot_look': 'value',
            'math:operation': 'value', 'math:random_number': 'value',
            'logic:operation': 'value', 'string:concat': 'value',
            'object:create': 'value', 'object:get': 'value', 'object:set': 'value',
            'object:delete': 'value', 'object:has_key': 'value',
        };

        const pin = legacyMap[node.type];
        if (pin) {
            await this.traverse(node, pin);
        }
    }

    clearLoopBodyMemo(loopNode) {
        this.traversal.clearLoopBodyMemo(loopNode);
    }

    async resolvePinValue(node, pinId, defaultValue = null) {
        const overrideValue = this.debugHandler?.getInputOverride(node.id, pinId);
        if (overrideValue !== undefined) return overrideValue;

        const connection = this.traversal.findIncomingConnection(node.id, pinId);
        if (connection) {
            const sourceNode = this.traversal.getNode(connection.sourceNodeId);
            return await this.evaluateOutputPin(sourceNode, connection.sourcePinId, defaultValue);
        }

        let value = node.data && node.data[pinId] !== undefined ? node.data[pinId] : defaultValue;

        if (typeof value === 'string' && value.includes('{')) {
            value = await this._replaceVariablesInString(value, node);
        }

        return value;
    }

    async _replaceVariablesInString(text, node) {
        const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
        const matches = [...text.matchAll(variablePattern)];
        const seen = new Set();
        let result = text;

        for (const match of matches) {
            const varName = match[1];
            if (seen.has(varName)) continue;
            seen.add(varName);
            const varValue = await this.resolvePinValue(node, `var_${varName}`, '');
            result = result.split(`{${varName}}`).join(String(varValue));
        }

        return result;
    }

    async evaluateOutputPin(node, pinId, defaultValue = null) {
        if (!node) return defaultValue;

        const cacheKey = `${node.id}:${pinId}`;
        if (this.memo.has(cacheKey)) return this.memo.get(cacheKey);

        const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
        if (nodeConfig && typeof nodeConfig.evaluator === 'function') {
            return await this._evaluateWithConfig(node, pinId, nodeConfig, cacheKey, defaultValue);
        }

        const result = this._evaluateLegacyNode(node, pinId, defaultValue);

        if (!this._isVolatile(node)) {
            this.memo.set(cacheKey, result);
        }

        return result;
    }

    async _evaluateWithConfig(node, pinId, nodeConfig, cacheKey, defaultValue) {
        const helpers = { resolvePinValue: this.resolvePinValue.bind(this), memo: this.memo };

        const traceKey = `trace_recorded:${node.id}`;
        const inputPins = GraphValidation.getNodeInputPins(nodeConfig, node.data);
        const outputPins = GraphValidation.getNodeOutputPins(nodeConfig, node.data);
        const isDataNode = !inputPins.some(p => p && p.type === PIN_TYPE_EXEC);

        if (this.currentTraceId && isDataNode && !this.memo.has(traceKey)) {
            this.traceCollector.recordStep(this.currentTraceId, {
                nodeId: node.id, nodeType: node.type, status: 'executed', duration: 0,
                inputs: await this._captureNodeInputs(node), outputs: {},
            });
            this.memo.set(traceKey, true);
        }

        const result = await nodeConfig.evaluator.call(this, node, pinId, this.context, helpers);

        if (!this._isVolatile(node)) {
            this.memo.set(cacheKey, result);
        }

        const traceOutputsKey = `trace_outputs_recorded:${node.id}`;
        if (this.currentTraceId && isDataNode && this.memo.has(traceKey) && !this.memo.has(traceOutputsKey)) {
            const outputs = {};
            for (const outputPin of outputPins) {
                if (outputPin && outputPin.type !== PIN_TYPE_EXEC) {
                    const outKey = `${node.id}:${outputPin.id}`;
                    if (this.memo.has(outKey)) outputs[outputPin.id] = this.memo.get(outKey);
                }
            }
            this.traceCollector.updateStepOutputs(this.currentTraceId, node.id, outputs);
            this.memo.set(traceOutputsKey, true);
        }

        return result;
    }

    _evaluateLegacyNode(node, pinId, defaultValue) {
        let result;

        switch (node.type) {
            case 'user:set_blacklist':
                result = this.memo.get(`${node.id}:updated_user`);
                break;
            case 'event:command':
                if (pinId === 'args') result = this.context.eventArgs?.args || {};
                else if (pinId === 'user') result = this.context.eventArgs?.user || {};
                else if (pinId === 'chat_type') result = this.context.eventArgs?.typeChat || 'chat';
                else if (pinId === 'command_name') result = this.context.eventArgs?.commandName;
                else if (pinId === 'success') result = this.context.success !== undefined ? this.context.success : true;
                else result = this.context.eventArgs?.[pinId];
                break;
            case 'event:chat':
                if (pinId === 'username') result = this.context.eventArgs?.username || this.context.username;
                else if (pinId === 'message') result = this.context.eventArgs?.message || this.context.message;
                else if (pinId === 'chatType') result = this.context.eventArgs?.chatType || this.context.chat_type;
                else result = this.context.eventArgs?.[pinId] || this.context[pinId];
                break;
            case 'event:raw_message':
                if (pinId === 'rawText') result = this.context.eventArgs?.rawText || this.context.rawText;
                else result = this.context.eventArgs?.[pinId] || this.context[pinId];
                break;
            case 'event:playerJoined':
            case 'event:playerLeft':
                if (pinId === 'user') result = this.context.eventArgs?.user || this.context.user;
                else result = this.context.eventArgs?.[pinId] || this.context[pinId];
                break;
            case 'event:entitySpawn':
            case 'event:entityMoved':
            case 'event:entityGone':
                if (pinId === 'entity') result = this.context.eventArgs?.entity || this.context.entity;
                else result = this.context.eventArgs?.[pinId] || this.context[pinId];
                break;
            case 'event:health':
            case 'event:botDied':
            case 'event:botStartup':
                result = this.context.eventArgs?.[pinId] || this.context[pinId];
                break;
            case 'event:websocket_call':
                if (pinId === 'graphName') result = this.context.eventArgs?.graphName || this.context.graphName;
                else if (pinId === 'data') result = this.context.eventArgs?.data || this.context.data;
                else if (pinId === 'socketId') result = this.context.eventArgs?.socketId || this.context.socketId;
                else if (pinId === 'keyPrefix') result = this.context.eventArgs?.keyPrefix || this.context.keyPrefix;
                else result = this.context.eventArgs?.[pinId] || this.context[pinId];
                break;
            case 'flow:for_each':
                if (pinId === 'element') result = this.memo.get(`${node.id}:element`);
                else if (pinId === 'index') result = this.memo.get(`${node.id}:index`);
                break;
            default:
                result = defaultValue;
        }

        return result;
    }

    hasConnection(node, pinId) {
        return this.traversal ? this.traversal.hasConnection(node.id, pinId) : false;
    }

    async _captureAllDataNodeOutputs() {
        if (!this.currentTraceId) return;

        const trace = await this.traceCollector.getTrace(this.currentTraceId);
        if (!trace || !trace.steps) return;

        for (const step of trace.steps) {
            if (step.type === 'traversal') continue;
            if (step.outputs && Object.keys(step.outputs).length > 0) continue;

            const node = this.traversal.getNode(step.nodeId);
            if (!node) continue;

            const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
            if (!nodeConfig) continue;

            const inputPins = GraphValidation.getNodeInputPins(nodeConfig, node.data);
            if (inputPins.some(p => p && p.type === PIN_TYPE_EXEC)) continue;

            try {
                const outputs = await this._captureNodeOutputs(node);
                if (outputs && Object.keys(outputs).length > 0) {
                    this.traceCollector.updateStepOutputs(this.currentTraceId, node.id, outputs);
                }
            } catch (error) {
                console.error(`[GraphExecutor] Error capturing outputs for data node ${node.id}:`, error);
            }
        }
    }

    async _captureNodeInputs(node) {
        const inputs = {};
        const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
        if (!nodeConfig) return inputs;

        const inputPins = GraphValidation.getNodeInputPins(nodeConfig, node.data);

        for (const inputPin of inputPins) {
            if (!inputPin || inputPin.type === PIN_TYPE_EXEC) continue;
            try {
                inputs[inputPin.id] = await this.resolvePinValue(node, inputPin.id);
            } catch {
                inputs[inputPin.id] = '<error capturing>';
            }
        }
        return inputs;
    }

    async _captureNodeOutputs(node) {
        const outputs = {};
        const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
        if (!nodeConfig) return outputs;

        const outputPins = GraphValidation.getNodeOutputPins(nodeConfig, node.data);

        for (const outputPin of outputPins) {
            if (!outputPin || outputPin.type === PIN_TYPE_EXEC) continue;
            try {
                outputs[outputPin.id] = await this.evaluateOutputPin(node, outputPin.id);
            } catch {
                outputs[outputPin.id] = '<error capturing>';
            }
        }
        return outputs;
    }
}

attachDebugIpcHandler();

module.exports = GraphExecutionEngine;
