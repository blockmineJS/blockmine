const debugConfig = require('../../config/debug.config');
const { getTraceCollector } = require('../services/TraceCollectorService');
const RewindSignal = require('../RewindSignal');

class DebugController {
  constructor(context, traceCollector = null, memo = null) {
    this.context = context;
    this.traceCollector = traceCollector || getTraceCollector();
    this.memo = memo;
    this.currentTraceId = null;
    this.pendingDebugRequests = new Map();
    this._inputOverrides = new Map();
  }

  setMemo(memo) {
    this.memo = memo;
  }

  setTraceId(traceId) {
    this.currentTraceId = traceId;
  }

  async checkBreakpoint(node) {
    try {
      if (process.send) {
        return await this.checkBreakpointViaIpc(node);
      }

      const { getGlobalDebugManager } = require('../services/DebugSessionManager');
      const debugManager = getGlobalDebugManager();
      const graphId = this.context.graphId;

      if (!graphId) return;

      const debugState = debugManager.get(graphId);
      if (!debugState) return;

      const breakpoint = debugState.breakpoints.get(node.id);
      if (!breakpoint || !breakpoint.enabled) return;

      const shouldPause = await this.evaluateBreakpointCondition(breakpoint);

      if (shouldPause) {
        breakpoint.hitCount++;
        const overrides = await this.handleBreakpointHit(node, breakpoint);
        this.applyOverrides(node, overrides);
      }
    } catch (error) {
      if (error instanceof RewindSignal) throw error;
      if (error.message === 'Execution stopped by debugger') throw error;
      if (error.message === 'DebugSessionManager not initialized! Call initializeDebugManager(io) first.') {
        return;
      }
    }
  }

  async checkBreakpointViaIpc(node) {
    const { randomUUID } = require('crypto');
    const requestId = randomUUID();

    const inputs = await this.captureNodeInputs(node);
    const executedSteps = this.currentTraceId
      ? await this.traceCollector.getTrace(this.currentTraceId)
      : null;

    process.send({
      type: 'debug:check_breakpoint',
      requestId,
      payload: {
        graphId: this.context.graphId,
        nodeId: node.id,
        nodeType: node.type,
        inputs,
        executedSteps,
        context: {
          user: this.context.user,
          variables: this.context.variables,
          commandArguments: this.context.commandArguments,
        }
      }
    });

    const overrides = await this.waitForDebugResponse(requestId, debugConfig.BREAKPOINT_TIMEOUT);

    if (overrides && overrides.__stopped) {
      throw new Error('Execution stopped by debugger');
    }

    if (overrides) {
      this.applyOverrides(node, overrides);
    }
  }

  async _checkStepMode(node) {
    try {
      if (process.send) {
        return await this.checkStepModeViaIpc(node);
      }

      const { getGlobalDebugManager } = require('../services/DebugSessionManager');
      const debugManager = getGlobalDebugManager();
      const graphId = this.context.graphId;

      if (graphId) {
        const debugState = debugManager.get(graphId);
        if (debugState && debugState.shouldStepPause(node.id)) {
          const inputs = await this.captureNodeInputs(node);
          const executedSteps = this.currentTraceId
            ? await this.traceCollector.getTrace(this.currentTraceId)
            : null;

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

          if (overrides && overrides.__rewind) {
            throw new RewindSignal(overrides.target);
          }

          if (overrides && overrides.__stopped) {
            throw new Error('Execution stopped by debugger');
          }

          if (overrides) {
            this.applyOverrides(node, overrides);
          }
        }
      }
    } catch (error) {
      if (error instanceof RewindSignal) throw error;
      if (error.message !== 'DebugSessionManager not initialized! Call initializeDebugManager(io) first.') {
        throw error;
      }
    }
  }

  async checkStepModeViaIpc(node) {
    const { randomUUID } = require('crypto');
    const requestId = randomUUID();

    const inputs = await this.captureNodeInputs(node);
    const executedSteps = this.currentTraceId
      ? await this.traceCollector.getTrace(this.currentTraceId)
      : null;

    process.send({
      type: 'debug:check_step_mode',
      requestId,
      payload: {
        graphId: this.context.graphId,
        nodeId: node.id,
        nodeType: node.type,
        inputs,
        executedSteps,
        context: {
          user: this.context.user,
          variables: this.context.variables,
          commandArguments: this.context.commandArguments,
        }
      }
    });

    await this.waitForDebugResponse(requestId, debugConfig.STEP_MODE_TIMEOUT);
  }

  async waitForDebugResponse(requestId, timeout) {
    return new Promise((resolve) => {
      this.pendingDebugRequests.set(requestId, resolve);

      const timeoutId = setTimeout(() => {
        if (this.pendingDebugRequests.has(requestId)) {
          this.pendingDebugRequests.delete(requestId);
          resolve(null);
        }
      }, timeout);

      this.pendingDebugRequests.set(`${requestId}_timeout`, timeoutId);
    });
  }

  handleDebugResponse(message) {
    const { requestId, overrides } = message;
    const resolve = this.pendingDebugRequests.get(requestId);

    if (resolve) {
      const timeoutId = this.pendingDebugRequests.get(`${requestId}_timeout`);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.pendingDebugRequests.delete(`${requestId}_timeout`);
      }

      this.pendingDebugRequests.delete(requestId);
      resolve(overrides);
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
      return false;
    }
  }

  async handleBreakpointHit(node, breakpoint) {
    const { getGlobalDebugManager } = require('../services/DebugSessionManager');
    const debugManager = getGlobalDebugManager();
    const graphId = this.context.graphId;

    if (!graphId) return null;

    const debugState = debugManager.get(graphId);
    if (!debugState) return null;

    const inputs = await this.captureNodeInputs(node);
    const executedSteps = this.currentTraceId
      ? await this.traceCollector.getTrace(this.currentTraceId)
      : null;

    return await debugState.pause({
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
  }

  applyOverrides(node, overrides) {
    if (!overrides || typeof overrides !== 'object') return;

    console.log(`[Debug] Applying what-if overrides to node ${node.id}:`, overrides);

    if (!this._inputOverrides) this._inputOverrides = new Map();

    for (const [key, value] of Object.entries(overrides)) {
        if (key === '__stopped' || key === '__rewind' || key === 'target') continue;

        if (key.startsWith('var.')) {
            const varName = key.substring(4);
            if (!this.context.variables) this.context.variables = {};
            this.context.variables[varName] = value;
            console.log(`[Debug] Variable override: ${varName} =`, value);
            continue;
        }

        const outIdx = key.indexOf('.out.');
        if (outIdx > 0) {
            const targetNodeId = key.substring(0, outIdx);
            const pinName = key.substring(outIdx + 5);
            const memoKey = `${targetNodeId}:${pinName}`;
            if (this.memo) this.memo.set(memoKey, value);
            console.log(`[Debug] Output override: ${memoKey} =`, value);
            continue;
        }

        const inIdx = key.indexOf('.in.');
        if (inIdx > 0) {
            const targetNodeId = key.substring(0, inIdx);
            const pinName = key.substring(inIdx + 4);
            this._inputOverrides.set(`${targetNodeId}:${pinName}`, value);
            console.log(`[Debug] Input override stored: ${targetNodeId}.${pinName} =`, value);
            continue;
        }

        this._inputOverrides.set(`${node.id}:${key}`, value);
        if (!node.data) node.data = {};
        node.data[key] = value;
        console.log(`[Debug] Current-node input override: ${node.id}.${key} =`, value);
    }
  }

  getInputOverride(nodeId, pinId) {
    if (!this._inputOverrides) return undefined;
    const k = `${nodeId}:${pinId}`;
    return this._inputOverrides.has(k) ? this._inputOverrides.get(k) : undefined;
  }

  clearOverrides() {
    this._inputOverrides.clear();
  }

  async captureNodeInputs(node) {
    return {};
  }
}

module.exports = DebugController;