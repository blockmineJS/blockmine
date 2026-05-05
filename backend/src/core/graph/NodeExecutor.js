const { MAX_RECURSION_DEPTH } = require('../config/validation');
const { getTraceCollector } = require('../services/TraceCollectorService');

class NodeExecutor {
  constructor(nodeRegistry, context, memo, traceCollector = null) {
    this.nodeRegistry = nodeRegistry;
    this.context = context;
    this.memo = memo;
    this.traceCollector = traceCollector || getTraceCollector();
    this.currentTraceId = null;
    this.activeGraph = null;
  }

  setTraceId(traceId) {
    this.currentTraceId = traceId;
  }

  setActiveGraph(activeGraph) {
    this.activeGraph = activeGraph;
  }

  findConnection(targetNodeId, targetPinId) {
    if (!this.activeGraph) return null;
    return this.activeGraph.connections.find(
      c => c.targetNodeId === targetNodeId && c.targetPinId === targetPinId
    );
  }

  async resolvePinValue(node, pinId, defaultValue = null) {
    const connection = this.findConnection(node.id, pinId);
    if (connection) {
      const sourceNode = this.activeGraph.nodes.find(n => n.id === connection.sourceNodeId);
      return await this.evaluateOutputPin(sourceNode, connection.sourcePinId, defaultValue);
    }

    let value = node.data && node.data[pinId] !== undefined ? node.data[pinId] : defaultValue;

    if (typeof value === 'string' && value.includes('{')) {
      value = await this.replaceVariablesInString(value, node);
    }

    return value;
  }

  async replaceVariablesInString(text, node) {
    const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const matches = [...text.matchAll(variablePattern)];

    let result = text;

    for (const match of matches) {
      const varName = match[1];
      const varValue = await this.resolvePinValue(node, `var_${varName}`, '');
      result = result.replace(match[0], String(varValue));
    }

    return result;
  }

  async evaluateOutputPin(node, pinId, defaultValue = null) {
    if (!node) return defaultValue;

    const cacheKey = `${node.id}:${pinId}`;
    if (this.memo.has(cacheKey)) {
      return this.memo.get(cacheKey);
    }

    const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
    if (nodeConfig && typeof nodeConfig.evaluator === 'function') {
      const helpers = {
        resolvePinValue: (pinId, defaultVal) => this.resolvePinValue(node, pinId, defaultVal),
        memo: this.memo,
      };

      const result = await nodeConfig.evaluator(node, pinId, this.context, helpers);

      if (!this.isNodeVolatile(node)) {
        this.memo.set(cacheKey, result);
      }

      return result;
    }

    const result = this.evaluateLegacyOutputPin(node, pinId, defaultValue);

    if (!this.isNodeVolatile(node)) {
      this.memo.set(cacheKey, result);
    }

    return result;
  }

  evaluateLegacyOutputPin(node, pinId, defaultValue = null) {
    switch (node.type) {
      case 'user:set_blacklist':
        return this.memo.get(`${node.id}:updated_user`);

      case 'event:command':
        if (pinId === 'args') return this.context.eventArgs?.args || {};
        else if (pinId === 'user') return this.context.eventArgs?.user || {};
        else if (pinId === 'chat_type') return this.context.eventArgs?.typeChat || 'chat';
        else if (pinId === 'command_name') return this.context.eventArgs?.commandName;
        else if (pinId === 'success') return this.context.success !== undefined ? this.context.success : true;
        else return this.context.eventArgs?.[pinId];

      case 'event:chat':
        if (pinId === 'username') return this.context.eventArgs?.username || this.context.username;
        else if (pinId === 'message') return this.context.eventArgs?.message || this.context.message;
        else if (pinId === 'chatType') return this.context.eventArgs?.chatType || this.context.chat_type;
        else return this.context.eventArgs?.[pinId] || this.context[pinId];

      case 'event:raw_message':
        if (pinId === 'rawText') return this.context.eventArgs?.rawText || this.context.rawText;
        else return this.context.eventArgs?.[pinId] || this.context[pinId];

      case 'event:playerJoined':
      case 'event:playerLeft':
        if (pinId === 'user') return this.context.eventArgs?.user || this.context.user;
        else return this.context.eventArgs?.[pinId] || this.context[pinId];

      case 'event:entitySpawn':
      case 'event:entityMoved':
      case 'event:entityGone':
        if (pinId === 'entity') return this.context.eventArgs?.entity || this.context.entity;
        else return this.context.eventArgs?.[pinId] || this.context[pinId];

      case 'event:health':
      case 'event:botDied':
      case 'event:botStartup':
        return this.context.eventArgs?.[pinId] || this.context[pinId];

      case 'event:websocket_call':
        if (pinId === 'graphName') return this.context.eventArgs?.graphName || this.context.graphName;
        else if (pinId === 'data') return this.context.eventArgs?.data || this.context.data;
        else if (pinId === 'socketId') return this.context.eventArgs?.socketId || this.context.socketId;
        else if (pinId === 'keyPrefix') return this.context.eventArgs?.keyPrefix || this.context.keyPrefix;
        else return this.context.eventArgs?.[pinId] || this.context[pinId];

      case 'flow:for_each':
        if (pinId === 'element') return this.memo.get(`${node.id}:element`);
        else if (pinId === 'index') return this.memo.get(`${node.id}:index`);
        break;

      default:
        return defaultValue;
    }
  }

  isNodeVolatile(node, visited = new Set(), depth = 0) {
    if (!node) return false;

    if (depth > MAX_RECURSION_DEPTH) {
      return false;
    }

    if (visited.has(node.id)) {
      return false;
    }
    visited.add(node.id);

    if (node.type === 'data:get_variable') {
      return true;
    }

    const connections = this.activeGraph?.connections?.filter(c => c.targetNodeId === node.id) || [];
    for (const conn of connections) {
      const sourceNode = this.activeGraph?.nodes?.find(n => n.id === conn.sourceNodeId);
      if (sourceNode && this.isNodeVolatile(sourceNode, visited, depth + 1)) {
        return true;
      }
    }

    return false;
  }
}

module.exports = NodeExecutor;