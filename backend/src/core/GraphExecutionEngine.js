const prismaService = require('./PrismaService');
const { parseVariables } = require('./utils/variableParser');
const validationService = require('./services/ValidationService');
const { MAX_RECURSION_DEPTH } = require('./config/validation');
const prisma = prismaService.getClient();

const BreakLoopSignal = require('./BreakLoopSignal');
const { getTraceCollector } = require('./services/TraceCollectorService');
const { getGlobalDebugManager } = require('./services/DebugSessionManager');

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

      const graphId = context.graphId || null;
      const botId = context.botId || null;
      if (graphId && botId) {
          this.currentTraceId = await this.traceCollector.startTrace(
              botId,
              graphId,
              eventType || 'command',
              context.eventArgs || {}
          );
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
              // Записываем event ноду как начальный шаг трассировки
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

              await this.traverse(startNode, 'exec');
          } else if (!eventType) {
              throw new Error(`Не найдена стартовая нода события (event:command) в графе.`);
          }

          // Завершаем трассировку успешно
          if (this.currentTraceId) {
              await this.traceCollector.completeTrace(this.currentTraceId);

              if (graphId) {
                  const debugManager = getGlobalDebugManager();
                  const debugState = debugManager.get(graphId);
                  if (debugState && debugState.activeExecution) {
                      debugState.broadcast('debug:completed', {
                          trace: await this.traceCollector.getTrace(this.currentTraceId)
                      });
                  }
              }

              this.currentTraceId = null;
          }

      } catch (error) {
          if (this.currentTraceId) {
              await this.traceCollector.failTrace(this.currentTraceId, error);
              this.currentTraceId = null;
          }

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

      // Записываем traversal в трассировку
      if (this.currentTraceId) {
          this.traceCollector.recordTraversal(
              this.currentTraceId,
              node.id,
              fromPinId,
              nextNode.id
          );
      }

      await this.executeNode(nextNode);
  }

  async executeNode(node) {
      const startTime = Date.now();

      // Проверка брейкпоинта ПЕРЕД выполнением
      await this.checkBreakpoint(node);

      const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
      if (nodeConfig && typeof nodeConfig.executor === 'function') {
          const helpers = {
              resolvePinValue: this.resolvePinValue.bind(this),
              traverse: this.traverse.bind(this),
              memo: this.memo,
              clearLoopBodyMemo: this.clearLoopBodyMemo.bind(this),
          };

          try {
              // Записываем шаг ДО выполнения, чтобы сохранить правильный порядок
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

              await nodeConfig.executor.call(this, node, this.context, helpers);

              // Вычисляем время выполнения
              const executionTime = Date.now() - startTime;

              // Обновляем outputs и duration после выполнения
              if (this.currentTraceId) {
                  this.traceCollector.updateStepOutputs(this.currentTraceId, node.id, await this._captureNodeOutputs(node));
                  this.traceCollector.updateStepDuration(this.currentTraceId, node.id, executionTime);
              }
          } catch (error) {
              // Записываем ошибку выполнения
              if (this.currentTraceId) {
                  this.traceCollector.recordStep(this.currentTraceId, {
                      nodeId: node.id,
                      nodeType: node.type,
                      status: 'error',
                      duration: Date.now() - startTime,
                      error: error.message,
                  });
              }
              throw error;
          }

          return;
      }

      const execCacheKey = `${node.id}_executed`;
      if (this.memo.has(execCacheKey)) {
          return;
      }
      this.memo.set(execCacheKey, true);

      // Записываем выполнение для нод без executor (legacy nodes, event nodes)
      try {
          // Записываем шаг ДО выполнения, чтобы сохранить правильный порядок
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

          await this._executeLegacyNode(node);

          // Вычисляем время выполнения
          const executionTime = Date.now() - startTime;

          // Обновляем outputs и duration после выполнения
          if (this.currentTraceId) {
              this.traceCollector.updateStepOutputs(this.currentTraceId, node.id, await this._captureNodeOutputs(node));
              this.traceCollector.updateStepDuration(this.currentTraceId, node.id, executionTime);
          }
      } catch (error) {
          // Записываем ошибку выполнения
          if (this.currentTraceId) {
              this.traceCollector.recordStep(this.currentTraceId, {
                  nodeId: node.id,
                  nodeType: node.type,
                  status: 'error',
                  duration: Date.now() - startTime,
                  error: error.message,
              });
          }
          throw error;
      }
  }

  async _executeLegacyNode(node) {
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

          // Записываем data ноду в трассировку перед вычислением (только один раз)
          const traceKey = `trace_recorded:${node.id}`;
          const isDataNode = !nodeConfig.pins.inputs.some(p => p.type === 'Exec');

          if (this.currentTraceId && isDataNode && !this.memo.has(traceKey)) {
              // Это data нода (нет exec пинов) и она ещё не записана - записываем её inputs
              const inputs = await this._captureNodeInputs(node);

              this.traceCollector.recordStep(this.currentTraceId, {
                  nodeId: node.id,
                  nodeType: node.type,
                  status: 'executed',
                  duration: 0,
                  inputs,
                  outputs: {},
              });

              // Помечаем, что нода уже записана в трассировку
              this.memo.set(traceKey, true);
          }

          const result = await nodeConfig.evaluator.call(this, node, pinId, this.context, helpers);

          const isVolatile = this.isNodeVolatile(node);
          if (!isVolatile) {
              this.memo.set(cacheKey, result);
          }

          // Обновляем outputs для data ноды после вычисления И после записи в memo
          // Обновляем только один раз для всей ноды (не для каждого пина отдельно)
          const traceOutputsKey = `trace_outputs_recorded:${node.id}`;
          if (this.currentTraceId && isDataNode && this.memo.has(traceKey) && !this.memo.has(traceOutputsKey)) {
              const outputs = {};
              for (const outputPin of nodeConfig.pins.outputs) {
                  if (outputPin.type !== 'Exec') {
                      const outKey = `${node.id}:${outputPin.id}`;
                      if (this.memo.has(outKey)) {
                          outputs[outputPin.id] = this.memo.get(outKey);
                      }
                  }
              }
              this.traceCollector.updateStepOutputs(this.currentTraceId, node.id, outputs);
              this.memo.set(traceOutputsKey, true); // Помечаем, что outputs уже записаны
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

  /**
   * Захватить значения входов ноды для трассировки
   */
  async _captureNodeInputs(node) {
      const inputs = {};

      // Получаем конфигурацию ноды
      const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
      if (!nodeConfig || !nodeConfig.pins || !nodeConfig.pins.inputs) {
          return inputs;
      }

      // Захватываем значения всех входов
      for (const inputPin of nodeConfig.pins.inputs) {
          if (inputPin.type === 'Exec') continue; // Пропускаем exec пины

          try {
              // Используем resolvePinValue для получения актуального значения
              const value = await this.resolvePinValue(node, inputPin.id);
              console.log(`[_captureNodeInputs] Node ${node.type} (${node.id}), pin ${inputPin.id}:`, value);
              // Записываем все значения, включая undefined и null
              inputs[inputPin.id] = value;
          } catch (error) {
              console.error(`[_captureNodeInputs] Error capturing pin ${inputPin.id}:`, error);
              inputs[inputPin.id] = '<error capturing>';
          }
      }

      console.log(`[_captureNodeInputs] Final inputs for ${node.type}:`, inputs);
      return inputs;
  }

  /**
   * Захватить значения выходов ноды для трассировки
   */
  async _captureNodeOutputs(node) {
      const outputs = {};

      // Получаем конфигурацию ноды
      const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
      if (!nodeConfig || !nodeConfig.pins || !nodeConfig.pins.outputs) {
          return outputs;
      }

      // Захватываем значения всех выходов
      for (const outputPin of nodeConfig.pins.outputs) {
          if (outputPin.type === 'Exec') continue; // Пропускаем exec пины

          try {
              // Активно вызываем evaluateOutputPin вместо чтения из memo
              // Это необходимо для event нод, которые используют switch-case и не пишут в memo
              const value = await this.evaluateOutputPin(node, outputPin.id);
              console.log(`[_captureNodeOutputs] Node ${node.type} (${node.id}), pin ${outputPin.id}:`, value);
              // Записываем все значения, включая undefined и null
              outputs[outputPin.id] = value;
          } catch (error) {
              console.error(`[_captureNodeOutputs] Error capturing pin ${outputPin.id}:`, error);
              outputs[outputPin.id] = '<error capturing>';
          }
      }

      console.log(`[_captureNodeOutputs] Final outputs for ${node.type}:`, outputs);
      return outputs;
  }

  /**
   * Проверить брейкпоинт перед выполнением ноды
   */
  async checkBreakpoint(node) {
      try {
          const debugManager = getGlobalDebugManager();
          const graphId = this.context.graphId;

          if (!graphId) return;

          const debugState = debugManager.get(graphId);
          if (!debugState) return;

          const breakpoint = debugState.breakpoints.get(node.id);
          if (!breakpoint || !breakpoint.enabled) return;

          const shouldPause = await this.evaluateBreakpointCondition(breakpoint);

          if (shouldPause) {
              console.log(`[Debug] Hit breakpoint at node ${node.id}, pausing execution`);

              breakpoint.hitCount++;

              const inputs = await this._captureNodeInputs(node);

              const executedSteps = this.currentTraceId
                  ? await this.traceCollector.getTrace(this.currentTraceId)
                  : null;

              const overrides = await debugState.pause({
                  nodeId: node.id,
                  nodeType: node.type,
                  inputs,
                  executedSteps, // Добавляем выполненные шаги
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

              if (overrides && overrides.__stopped) {
                  throw new Error('Execution stopped by debugger');
              }

              if (overrides) {
                  this.applyWhatIfOverrides(node, overrides);
              }
          }
      } catch (error) {
          if (error.message === 'DebugSessionManager not initialized! Call initializeDebugManager(io) first.') {
              return;
          }
          throw error;
      }
  }

  /**
   * Оценить условие брейкпоинта
   */
  async evaluateBreakpointCondition(breakpoint) {
      // Если нет условия, всегда срабатывает
      if (!breakpoint.condition || breakpoint.condition.trim() === '') {
          return true;
      }

      try {
          // Создаем sandbox для безопасного выполнения условия
          const sandbox = {
              user: this.context.user || {},
              args: this.context.commandArguments || {},
              variables: this.context.variables || {},
              context: this.context
          };

          // Используем Function constructor для безопасного выполнения
          const fn = new Function(
              ...Object.keys(sandbox),
              `return (${breakpoint.condition})`
          );

          const result = fn(...Object.values(sandbox));

          return Boolean(result);
      } catch (error) {
          console.error(`[Debug] Error evaluating breakpoint condition: ${error.message}`);
          console.error(`[Debug] Condition was: ${breakpoint.condition}`);
          return false;
      }
  }

  /**
   * Применить what-if overrides к ноде
   */
  applyWhatIfOverrides(node, overrides) {
      if (!overrides || typeof overrides !== 'object') return;

      console.log(`[Debug] Applying what-if overrides to node ${node.id}:`, overrides);

      // Применяем overrides к node.data
      if (!node.data) {
          node.data = {};
      }

      for (const [key, value] of Object.entries(overrides)) {
          if (key !== '__stopped') {
              node.data[key] = value;
              console.log(`[Debug] Override applied: ${key} = ${value}`);
          }
      }
  }
}

module.exports = GraphExecutionEngine;