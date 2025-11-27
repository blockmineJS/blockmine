const prismaService = require('./PrismaService');
const { parseVariables } = require('./utils/variableParser');
const validationService = require('./services/ValidationService');
const { MAX_RECURSION_DEPTH } = require('./config/validation');
const debugConfig = require('../config/debug.config');
const prisma = prismaService.getClient();

const BreakLoopSignal = require('./BreakLoopSignal');
const { getTraceCollector } = require('./services/TraceCollectorService');
const { getGlobalDebugManager } = require('./services/DebugSessionManager');

class GraphExecutionEngine {
  // Static флаг для предотвращения дублирования IPC handler
  static _ipcHandlerAttached = false;
  // Static Map для хранения всех pending requests из всех instances
  static _allPendingRequests = new Map();

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

      // Используем статическую Map для всех instance
      this.pendingDebugRequests = GraphExecutionEngine._allPendingRequests;

      if (process.on && !GraphExecutionEngine._ipcHandlerAttached) {
          process.on('message', (message) => {
              if (message.type === 'debug:breakpoint_response' || message.type === 'debug:step_response') {
                  GraphExecutionEngine._handleGlobalDebugResponse(message);
              }
          });
          GraphExecutionEngine._ipcHandlerAttached = true;
      }
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

          if (this.currentTraceId) {
              // Перед завершением trace, захватываем outputs для всех data-нод
              await this._captureAllDataNodeOutputs();

              const trace = await this.traceCollector.completeTrace(this.currentTraceId);

              // Если работаем в дочернем процессе (BotProcess), отправляем трассировку в главный процесс
              if (trace && process.send) {
                  process.send({
                      type: 'trace:completed',
                      trace: {
                          ...trace,
                          steps: trace.steps,
                          eventArgs: typeof trace.eventArgs === 'string' ? trace.eventArgs : JSON.stringify(trace.eventArgs)
                      }
                  });
              }

              // Отправляем debug событие только если DebugSessionManager инициализирован
              // (он может быть не инициализирован в дочерних процессах BotProcess)
              if (graphId) {
                  try {
                      const debugManager = getGlobalDebugManager();
                      const debugState = debugManager.get(graphId);
                      if (debugState && debugState.activeExecution) {
                          debugState.broadcast('debug:completed', {
                              trace: await this.traceCollector.getTrace(this.currentTraceId)
                          });
                      }
                  } catch (error) {
                      // DebugSessionManager не инициализирован - это нормально для дочерних процессов
                      // Просто игнорируем
                  }
              }

              this.currentTraceId = null;
          }

      } catch (error) {
          if (this.currentTraceId) {
              // Даже при ошибке захватываем outputs для data-нод
              try {
                  await this._captureAllDataNodeOutputs();
              } catch (captureError) {
                  console.error(`[GraphExecutor] Error capturing outputs on failure:`, captureError);
              }

              const trace = await this.traceCollector.failTrace(this.currentTraceId, error);

              // Если работаем в дочернем процессе (BotProcess), отправляем трассировку с ошибкой в главный процесс
              if (trace && process.send) {
                  process.send({
                      type: 'trace:completed',
                      trace: {
                          ...trace,
                          steps: trace.steps,
                          eventArgs: typeof trace.eventArgs === 'string' ? trace.eventArgs : JSON.stringify(trace.eventArgs)
                      }
                  });
              }

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

      // Записываем шаг ДО проверки брейкпоинта, чтобы в trace были данные о предыдущих нодах
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

      // Проверка брейкпоинта ПЕРЕД выполнением (но ПОСЛЕ записи в trace)
      await this.checkBreakpoint(node);

      // Проверка step mode ПЕРЕД выполнением (важно делать ДО executor, чтобы поймать ноду до traverse)
      await this._checkStepMode(node);

      const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
      if (nodeConfig && typeof nodeConfig.executor === 'function') {
          const helpers = {
              resolvePinValue: this.resolvePinValue.bind(this),
              traverse: this.traverse.bind(this),
              memo: this.memo,
              clearLoopBodyMemo: this.clearLoopBodyMemo.bind(this),
          };

          try {
              await nodeConfig.executor.call(this, node, this.context, helpers);

              const executionTime = Date.now() - startTime;

              if (this.currentTraceId) {
                  this.traceCollector.updateStepOutputs(this.currentTraceId, node.id, await this._captureNodeOutputs(node));
                  this.traceCollector.updateStepDuration(this.currentTraceId, node.id, executionTime);
              }
          } catch (error) {
              if (this.currentTraceId) {
                  this.traceCollector.updateStepError(
                      this.currentTraceId,
                      node.id,
                      error.message,
                      Date.now() - startTime
                  );
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

      try {
          await this._executeLegacyNode(node);


          const executionTime = Date.now() - startTime;

          if (this.currentTraceId) {
              this.traceCollector.updateStepOutputs(this.currentTraceId, node.id, await this._captureNodeOutputs(node));
              this.traceCollector.updateStepDuration(this.currentTraceId, node.id, executionTime);
          }
      } catch (error) {
          if (this.currentTraceId) {
              this.traceCollector.updateStepError(
                  this.currentTraceId,
                  node.id,
                  error.message,
                  Date.now() - startTime
              );
          }
          throw error;
      }
  }

  async _checkStepMode(node) {
      try {
          // Если работаем в дочернем процессе, используем IPC
          if (process.send) {
              return await this._checkStepModeViaIpc(node);
          }

          // Иначе используем прямой доступ к DebugManager
          const { getGlobalDebugManager } = require('./services/DebugSessionManager');
          const debugManager = getGlobalDebugManager();
          const graphId = this.activeGraph?.id;

          if (graphId) {
              const debugState = debugManager.get(graphId);
              if (debugState && debugState.shouldStepPause(node.id)) {
                  console.log(`[Debug] Step mode: pausing after executing node ${node.id}`);

                  // Получаем inputs для отправки в debug session
                  const inputs = await this._captureNodeInputs(node);

                  // Получаем текущую трассировку для отображения выполненных шагов
                  const executedSteps = this.currentTraceId
                      ? await this.traceCollector.getTrace(this.currentTraceId)
                      : null;

                  // Паузим выполнение
                  await debugState.pause({
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
              }
          }
      } catch (error) {
          if (error.message !== 'DebugSessionManager not initialized! Call initializeDebugManager(io) first.') {
              throw error;
          }
      }
  }

  async _checkStepModeViaIpc(node) {
      // Step mode работает аналогично breakpoint, просто отправляем тип 'step'
      const { randomUUID } = require('crypto');
      const requestId = randomUUID();

      const inputs = await this._captureNodeInputs(node);
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

      // Ждём ответа (если step mode не активен, ответ придёт сразу)
      await new Promise((resolve) => {
          this.pendingDebugRequests.set(requestId, resolve);

          // Таймаут на случай, если ответ не придёт
          const timeoutId = setTimeout(() => {
              if (this.pendingDebugRequests.has(requestId)) {
                  this.pendingDebugRequests.delete(requestId);
                  resolve(null);
              }
          }, debugConfig.STEP_MODE_TIMEOUT);

          // Сохраняем timeoutId для возможной отмены
          this.pendingDebugRequests.set(`${requestId}_timeout`, timeoutId);
      });
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

      let value = node.data && node.data[pinId] !== undefined ? node.data[pinId] : defaultValue;

      // Автоматически заменяем переменные {varName} в строковых значениях
      if (typeof value === 'string' && value.includes('{')) {
          value = await this._replaceVariablesInString(value, node);
      }

      return value;
  }

  /**
   * Заменяет переменные {varName} на значения из пинов
   * @private
   */
  async _replaceVariablesInString(text, node) {
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
   * Захватить outputs для всех data-нод в trace
   * Вызывается перед завершением trace, чтобы гарантировать,
   * что для всех data-нод записаны outputs (даже если их выходы не подключены)
   */
  async _captureAllDataNodeOutputs() {
      if (!this.currentTraceId) return;

      const trace = await this.traceCollector.getTrace(this.currentTraceId);
      if (!trace || !trace.steps) return;

      // Проходим по всем шагам и находим data-ноды
      for (const step of trace.steps) {
          if (step.type === 'traversal') continue;

          // Проверяем, есть ли уже outputs
          if (step.outputs && Object.keys(step.outputs).length > 0) continue;

          // Находим ноду в графе
          const node = this.activeGraph.nodes.find(n => n.id === step.nodeId);
          if (!node) continue;

          // Получаем конфигурацию ноды
          const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
          if (!nodeConfig) continue;

          // Проверяем, является ли это data-нодой (нет exec входов)
          const isDataNode = !nodeConfig.pins.inputs.some(p => p.type === 'Exec');
          if (!isDataNode) continue;

          // Захватываем outputs
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
              // Записываем все значения, включая undefined и null
              inputs[inputPin.id] = value;
          } catch (error) {
              inputs[inputPin.id] = '<error capturing>';
          }
      }
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
              // Записываем все значения, включая undefined и null
              outputs[outputPin.id] = value;
          } catch (error) {
              outputs[outputPin.id] = '<error capturing>';
          }
      }
      return outputs;
  }

  /**
   * Проверить брейкпоинт перед выполнением ноды
   */
  async checkBreakpoint(node) {
      try {
          // Если работаем в дочернем процессе, используем IPC
          if (process.send) {
              return await this._checkBreakpointViaIpc(node);
          }

          // Иначе используем прямой доступ к DebugManager
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
          console.error(`[checkBreakpoint] ERROR:`, error.message, error.stack);
          if (error.message === 'DebugSessionManager not initialized! Call initializeDebugManager(io) first.') {
              return;
          }
          // НЕ пробрасываем ошибку дальше, чтобы не сломать выполнение
          console.error(`[checkBreakpoint] Ignoring error to continue execution`);
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
  /**
   * Проверить брейкпоинт через IPC (для дочерних процессов)
   */
  async _checkBreakpointViaIpc(node) {
      try {
          const { randomUUID } = require('crypto');
          const requestId = randomUUID();

          const inputs = await this._captureNodeInputs(node);
          const executedSteps = this.currentTraceId
              ? await this.traceCollector.getTrace(this.currentTraceId)
              : null;

          // Отправляем запрос в главный процесс
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

          // Ждём ответа
          const overrides = await new Promise((resolve) => {
              this.pendingDebugRequests.set(requestId, resolve);

              // Таймаут на случай, если ответ не придёт
              const timeoutId = setTimeout(() => {
                  if (this.pendingDebugRequests.has(requestId)) {
                      this.pendingDebugRequests.delete(requestId);
                      resolve(null);
                  }
              }, debugConfig.BREAKPOINT_TIMEOUT);

              // Сохраняем timeoutId для возможной отмены
              this.pendingDebugRequests.set(`${requestId}_timeout`, timeoutId);
          });

          if (overrides && overrides.__stopped) {
              throw new Error('Execution stopped by debugger');
          }

          if (overrides) {
              this.applyWhatIfOverrides(node, overrides);
          }
      } catch (error) {
          if (error.message === 'Execution stopped by debugger') {
              throw error;
          }
      }
  }

  /**
   * Статический обработчик IPC ответов (глобальный для всех instances)
   */
  static _handleGlobalDebugResponse(message) {
      const { requestId, overrides } = message;
      const resolve = GraphExecutionEngine._allPendingRequests.get(requestId);

      if (resolve) {
          // Отменяем таймаут
          const timeoutId = GraphExecutionEngine._allPendingRequests.get(`${requestId}_timeout`);
          if (timeoutId) {
              clearTimeout(timeoutId);
              GraphExecutionEngine._allPendingRequests.delete(`${requestId}_timeout`);
          }

          GraphExecutionEngine._allPendingRequests.delete(requestId);
          resolve(overrides);
      }
  }

  /**
   * Обработать IPC ответ от главного процесса (legacy wrapper)
   */
  _handleDebugResponse(message) {
      GraphExecutionEngine._handleGlobalDebugResponse(message);
  }

  applyWhatIfOverrides(node, overrides) {
      if (!overrides || typeof overrides !== 'object') return;

      console.log(`[Debug] Applying what-if overrides to node ${node.id}:`, overrides);

      for (const [key, value] of Object.entries(overrides)) {
          if (key === '__stopped') continue;

          // Парсим ключ для определения типа изменения
          // Форматы:
          // - "var.varName" - переменная графа
          // - "nodeId.out.pinName" - выходной пин ноды
          // - "nodeId.in.pinName" - входной пин ноды
          // - "pinName" - входной пин текущей ноды

          if (key.startsWith('var.')) {
              // Изменение переменной графа
              const varName = key.substring(4);
              if (!this.context.variables) {
                  this.context.variables = {};
              }
              this.context.variables[varName] = value;
              console.log(`[Debug] Variable override: ${varName} = ${JSON.stringify(value)}`);
          }
          else if (key.includes('.out.')) {
              // Изменение выходного пина ноды
              const [nodeId, , pinName] = key.split('.');
              const memoKey = `${nodeId}:${pinName}`;
              this.memo.set(memoKey, value);
              console.log(`[Debug] Output override: ${memoKey} = ${JSON.stringify(value)}`);
          }
          else if (key.includes('.in.')) {
              // Изменение входного пина ноды (пока не применяется, но можно расширить)
              const [nodeId, , pinName] = key.split('.');
              console.log(`[Debug] Input override (informational): ${nodeId}.${pinName} = ${JSON.stringify(value)}`);
              // Входы можно изменить через изменение outputs предыдущих нод или переменных
          }
          else {
              // Изменение входного пина текущей ноды
              if (!node.data) {
                  node.data = {};
              }
              node.data[key] = value;
          }
      }
  }
}

module.exports = GraphExecutionEngine;