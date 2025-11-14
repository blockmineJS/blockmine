const prismaService = require('./PrismaService');
const { parseVariables } = require('./utils/variableParser');
const validationService = require('./services/ValidationService');
const { MAX_RECURSION_DEPTH } = require('./config/validation');
const prisma = prismaService.getClient();

const BreakLoopSignal = require('./BreakLoopSignal');

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
  }

  async execute(graph, context, eventType) {
      if (!graph || graph === 'null') return context;

      const parsedGraph = validationService.parseGraph(graph, 'GraphExecutionEngine.execute');
      if (!parsedGraph) {
          return context;
      }

      const validation = validationService.validateGraphStructure(parsedGraph, 'GraphExecutionEngine');
      if (validation.shouldSkip) {
          return context;
      }

      try {
          this.activeGraph = parsedGraph;
          this.context = context;
          
          if (!this.context.variables) {
            this.context.variables = parseVariables(
              this.activeGraph.variables,
              'GraphExecutionEngine'
            );
          }

          if (!this.context.persistenceIntent) this.context.persistenceIntent = new Map();
          this.memo.clear();

          const eventName = eventType || 'command';
          const startNode = this.activeGraph.nodes.find(n => n.type === `event:${eventName}`);

          if (startNode) {
              await this.traverse(startNode, 'exec');
          } else if (!eventType) {
              throw new Error(`Не найдена стартовая нода события (event:command) в графе.`);
          }

      } catch (error) {
          if (!(error instanceof BreakLoopSignal)) {
            console.error(`[GraphExecutionEngine] Критическая ошибка выполнения графа: ${error.stack}`);
          }
      }

      return this.context;
  }

  async traverse(node, fromPinId) {
      const connection = this.activeGraph.connections.find(c => c.sourceNodeId === node.id && c.sourcePinId === fromPinId);
      if (!connection) return;

      const nextNode = this.activeGraph.nodes.find(n => n.id === connection.targetNodeId);
      if (!nextNode) return;

      await this.executeNode(nextNode);
  }

  async executeNode(node) {
      const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
      if (nodeConfig && typeof nodeConfig.executor === 'function') {
          const helpers = {
              resolvePinValue: this.resolvePinValue.bind(this),
              traverse: this.traverse.bind(this),
              memo: this.memo,
              clearLoopBodyMemo: this.clearLoopBodyMemo.bind(this),
          };
          await nodeConfig.executor.call(this, node, this.context, helpers);
          return;
      }

      const execCacheKey = `${node.id}_executed`;
      if (this.memo.has(execCacheKey)) {
          return;
      }
      this.memo.set(execCacheKey, true);

      switch (node.type) {







          case 'string:contains':
          case 'string:matches':
          case 'string:equals': {
              await this.traverse(node, 'exec');
              break;
          }
          case 'array:get_random_element': {
              await this.traverse(node, 'element');
              break;
          }
          case 'array:add_element':
          case 'array:remove_by_index':
          case 'array:get_by_index':
          case 'array:find_index':
          case 'array:contains': {
              await this.traverse(node, 'result');
              break;
          }
          case 'data:array_literal':
          case 'data:make_object':
          case 'data:get_variable':
          case 'data:get_argument':
          case 'data:length':
          case 'data:get_entity_field':
          case 'data:cast':
          case 'data:string_literal':
          case 'data:get_user_field':
          case 'data:get_server_players':
          case 'data:get_bot_look':
          case 'math:operation':
          case 'math:random_number':
          case 'logic:operation':
          case 'string:concat':
          case 'object:create':
          case 'object:get':
          case 'object:set':
          case 'object:delete':
          case 'object:has_key': {
              await this.traverse(node, 'value');
              break;
          }
      }
  }

  clearLoopBodyMemo(loopNode) {
    const nodesToClear = new Set();
    const queue = [];

    const initialConnection = this.activeGraph.connections.find(
      c => c.sourceNodeId === loopNode.id && c.sourcePinId === 'loop_body'
    );
    if (initialConnection) {
        const firstNode = this.activeGraph.nodes.find(n => n.id === initialConnection.targetNodeId);
        if (firstNode) {
            queue.push(firstNode);
        }
    }
    
    const visited = new Set();
    while (queue.length > 0) {
      const currentNode = queue.shift();
      if (visited.has(currentNode.id)) continue;
      visited.add(currentNode.id);
      
      nodesToClear.add(currentNode.id);
      
      const connections = this.activeGraph.connections.filter(c => c.sourceNodeId === currentNode.id);
      for (const conn of connections) {
        const nextNode = this.activeGraph.nodes.find(n => n.id === conn.targetNodeId);
        if (nextNode) {
          queue.push(nextNode);
        }
      }
    }

    for (const nodeId of nodesToClear) {
        for (const key of this.memo.keys()) {
            if (key.startsWith(nodeId)) {
                this.memo.delete(key);
            }
        }
    }
  }

  async resolvePinValue(node, pinId, defaultValue = null) {
      const connection = this.activeGraph.connections.find(c => c.targetNodeId === node.id && c.targetPinId === pinId);
      if (connection) {
          const sourceNode = this.activeGraph.nodes.find(n => n.id === connection.sourceNodeId);
          return await this.evaluateOutputPin(sourceNode, connection.sourcePinId, defaultValue);
      }
      return node.data && node.data[pinId] !== undefined ? node.data[pinId] : defaultValue;
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
              resolvePinValue: this.resolvePinValue.bind(this),
              memo: this.memo,
          };
          const result = await nodeConfig.evaluator.call(this, node, pinId, this.context, helpers);
          
          const isVolatile = this.isNodeVolatile(node);
          if (!isVolatile) {
              this.memo.set(cacheKey, result);
          }
          return result;
      }

      let result;

      switch (node.type) {
          case 'user:set_blacklist':
              result = this.memo.get(`${node.id}:updated_user`);
              break;
          case 'event:command':
              if (pinId === 'args') result = this.context.args || {};
              else if (pinId === 'user') result = this.context.user || {};
              else if (pinId === 'chat_type') result = this.context.chat_type || 'chat';
              else if (pinId === 'success') result = this.context.success !== undefined ? this.context.success : true;
              else result = this.context[pinId];
              break;
          case 'event:chat':
              if (pinId === 'username') result = this.context.username;
              else if (pinId === 'message') result = this.context.message;
              else if (pinId === 'chatType') result = this.context.chat_type;
              else result = this.context[pinId];
              break;
          case 'event:raw_message':
              if (pinId === 'rawText') result = this.context.rawText;
              else result = this.context[pinId];
              break;
          case 'event:playerJoined':
          case 'event:playerLeft':
              result = this.context[pinId];
              break;
          case 'event:entitySpawn':
          case 'event:entityMoved':
          case 'event:entityGone':
              result = this.context[pinId];
              break;
          case 'event:health':
          case 'event:botDied':
              result = this.context[pinId];
              break;
          case 'event:websocket_call':
              if (pinId === 'graphName') result = this.context.graphName;
              else if (pinId === 'data') result = this.context.data;
              else if (pinId === 'socketId') result = this.context.socketId;
              else if (pinId === 'keyPrefix') result = this.context.keyPrefix;
              else result = this.context[pinId];
              break;

          case 'flow:for_each': {
            if (pinId === 'element') {
                result = this.memo.get(`${node.id}:element`);
            } else if (pinId === 'index') {
                result = this.memo.get(`${node.id}:index`);
            }
            break;
          }

          default:
              result = defaultValue;
              break;
      }

      const isVolatile = this.isNodeVolatile(node);

      if (!isVolatile) {
          this.memo.set(cacheKey, result);
      }

      return result;
  }

  isNodeVolatile(node, visited = new Set(), depth = 0) {
    if (!node) return false;

    if (depth > MAX_RECURSION_DEPTH) {
        console.warn(`[GraphExecutionEngine] isNodeVolatile достиг максимальной глубины рекурсии (${MAX_RECURSION_DEPTH})`);
        return false;
    }

    if (visited.has(node.id)) {
        return false;
    }
    visited.add(node.id);

    if (node.type === 'data:get_variable') {
        return true;
    }

    const connections = this.activeGraph.connections.filter(c => c.targetNodeId === node.id);
    for (const conn of connections) {
        const sourceNode = this.activeGraph.nodes.find(n => n.id === conn.sourceNodeId);
        if (this.isNodeVolatile(sourceNode, visited, depth + 1)) {
            return true;
        }
    }

    return false;
  }

  hasConnection(node, pinId) {
      if (!this.activeGraph || !this.activeGraph.connections) return false;
      return this.activeGraph.connections.some(conn => 
          conn.targetNodeId === node.id && conn.targetPinId === pinId
      );
  }
}

module.exports = GraphExecutionEngine;