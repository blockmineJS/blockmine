const { getGlobalDebugManager } = require('./services/DebugSessionManager');
const RewindSignal = require('./RewindSignal');
const { MAX_RECURSION_DEPTH } = require('./config/validation');

class GraphDebugHandler {
    constructor(context) {
        this.context = context;
        this._inputOverrides = new Map();
    }

    async checkBreakpoint(node, captureNodeInputs, captureNodeOutputs, currentTraceId, traceCollector) {
        try {
            if (process.send) {
                const debugIPC = require('./GraphDebugIPC');
                return await debugIPC.checkBreakpointViaIpc(
                    node, this.context, captureNodeInputs, currentTraceId, traceCollector
                );
            }

            const debugManager = getGlobalDebugManager();
            const graphId = this.context.graphId;

            if (!graphId) return null;

            const debugState = debugManager.get(graphId);
            if (!debugState) return null;

            const breakpoint = debugState.breakpoints.get(node.id);
            if (!breakpoint || !breakpoint.enabled) return null;

            const shouldPause = await this.evaluateBreakpointCondition(breakpoint);
            if (!shouldPause) return null;

            console.log(`[Debug] Hit breakpoint at node ${node.id}, pausing execution`);

            breakpoint.hitCount++;

            const inputs = await captureNodeInputs(node);
            const executedSteps = currentTraceId ? await traceCollector.getTrace(currentTraceId) : null;

            const overrides = await debugState.pause({
                nodeId: node.id,
                nodeType: node.type,
                inputs,
                executedSteps,
                context: {
                    user: this.context.user,
                    variables: this.context.variables,
                    commandArguments: this.context.commandArguments,
                },
                breakpoint: {
                    condition: breakpoint.condition,
                    hitCount: breakpoint.hitCount
                }
            });

            return this.processOverrides(overrides);

        } catch (error) {
            if (error instanceof RewindSignal) throw error;
            if (error.message === 'Execution stopped by debugger') throw error;
            if (error.message === 'DebugSessionManager not initialized! Call initializeDebugManager(io) first.') {
                return null;
            }
            console.error(`[checkBreakpoint] ERROR:`, error.message);
            return null;
        }
    }

    async checkStepMode(node, captureNodeInputs, currentTraceId, traceCollector) {
        try {
            if (process.send) {
                const debugIPC = require('./GraphDebugIPC');
                return await debugIPC.checkStepModeViaIpc(
                    node, this.context, captureNodeInputs, currentTraceId, traceCollector
                );
            }

            const debugManager = getGlobalDebugManager();
            const graphId = this.context.graphId;

            if (!graphId) return null;

            const debugState = debugManager.get(graphId);
            if (!debugState || !debugState.shouldStepPause(node.id)) return null;

            console.log(`[Debug] Step mode: pausing after executing node ${node.id}`);

            const inputs = await captureNodeInputs(node);
            const executedSteps = currentTraceId ? await traceCollector.getTrace(currentTraceId) : null;

            const overrides = await debugState.pause({
                nodeId: node.id,
                nodeType: node.type,
                inputs,
                executedSteps,
                context: {
                    user: this.context.user,
                    variables: this.context.variables,
                    commandArguments: this.context.commandArguments,
                }
            });

            return this.processOverrides(overrides);

        } catch (error) {
            if (error instanceof RewindSignal) throw error;
            if (error.message === 'DebugSessionManager not initialized! Call initializeDebugManager(io) first.') {
                return null;
            }
            throw error;
        }
    }

    async evaluateBreakpointCondition(breakpoint) {
        if (!breakpoint.condition || breakpoint.condition.trim() === '') {
            return true;
        }

        try {
            const sandbox = {
                user: this.context.user || {},
                args: this.context.commandArguments || {},
                variables: this.context.variables || {},
                context: this.context
            };

            const fn = new Function(
                ...Object.keys(sandbox),
                `return (${breakpoint.condition})`
            );

            return Boolean(fn(...Object.values(sandbox)));
        } catch (error) {
            console.error(`[Debug] Error evaluating breakpoint condition: ${error.message}`);
            return false;
        }
    }

    processOverrides(overrides) {
        if (!overrides) return null;

        if (overrides.__stopped) {
            throw new Error('Execution stopped by debugger');
        }

        if (overrides.__rewind) {
            throw new RewindSignal(overrides.target);
        }

        this.applyWhatIfOverrides(overrides);
        return overrides;
    }

    applyWhatIfOverrides(node, overrides) {
        if (!overrides || typeof overrides !== 'object') return;

        console.log(`[Debug] Applying what-if overrides to node ${node.id}:`, overrides);

        for (const [key, value] of Object.entries(overrides)) {
            if (key === '__stopped' || key === '__rewind' || key === 'target') continue;

            if (key.startsWith('var.')) {
                const varName = key.substring(4);
                if (!this.context.variables) this.context.variables = {};
                this.context.variables[varName] = value;
                continue;
            }

            const outIdx = key.indexOf('.out.');
            if (outIdx > 0) {
                const targetNodeId = key.substring(0, outIdx);
                const pinName = key.substring(outIdx + 5);
                this._inputOverrides.set(`${targetNodeId}:${pinName}`, value);
                continue;
            }

            const inIdx = key.indexOf('.in.');
            if (inIdx > 0) {
                const targetNodeId = key.substring(0, inIdx);
                const pinName = key.substring(inIdx + 4);
                this._inputOverrides.set(`${targetNodeId}:${pinName}`, value);
                continue;
            }

            this._inputOverrides.set(`${node.id}:${key}`, value);
            if (!node.data) node.data = {};
            node.data[key] = value;
        }
    }

    getInputOverride(nodeId, pinId) {
        if (!this._inputOverrides) return undefined;
        const k = `${nodeId}:${pinId}`;
        return this._inputOverrides.has(k) ? this._inputOverrides.get(k) : undefined;
    }

    isNodeVolatile(node, activeGraph) {
        return GraphDebugHandler.checkVolatility(node, activeGraph);
    }

    static checkVolatility(node, activeGraph, visited = new Set(), depth = 0) {
        if (!node) return false;

        if (depth > MAX_RECURSION_DEPTH) {
            console.warn(`[GraphDebugHandler] isNodeVolatile reached max recursion (${MAX_RECURSION_DEPTH})`);
            return false;
        }

        if (visited.has(node.id)) return false;
        visited.add(node.id);

        if (node.type === 'data:get_variable') return true;

        if (!activeGraph || !activeGraph.connections) return false;

        const connections = activeGraph.connections.filter(c => c.targetNodeId === node.id);
        for (const conn of connections) {
            const sourceNode = activeGraph.nodes.find(n => n.id === conn.sourceNodeId);
            if (GraphDebugHandler.checkVolatility(sourceNode, activeGraph, visited, depth + 1)) {
                return true;
            }
        }

        return false;
    }
}

module.exports = GraphDebugHandler;