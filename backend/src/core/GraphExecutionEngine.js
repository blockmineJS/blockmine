// File: backend/src/core/GraphExecutionEngine.js

/**
 * Движок для выполнения визуальных команд, представленных в виде графа.
 */
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

      let parsedGraph;
      if (typeof graph === 'string') {
          try {
              parsedGraph = JSON.parse(graph);
          } catch (e) {
              console.error('[GraphExecutionEngine] Ошибка парсинга JSON графа:', e);
              return context;
          }
      } else {
          parsedGraph = graph;
      }

      if (!parsedGraph.nodes || !parsedGraph.connections) {
          console.error('[GraphExecutionEngine] Неверный формат графа. Отсутствуют nodes или connections.');
          return context;
      }

      try {
          this.activeGraph = parsedGraph;
          this.context = context;
          if (!this.context.variables) this.context.variables = {};
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
          console.error(`[GraphExecutionEngine] Критическая ошибка выполнения графа: ${error.stack}`);
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
      switch (node.type) {
          case 'action:send_message': {
              const message = await this.resolvePinValue(node, 'message', '');
              const chatType = await this.resolvePinValue(node, 'chat_type', this.context.typeChat);
              const recipient = await this.resolvePinValue(node, 'recipient', this.context.user?.username);
              this.context.bot.sendMessage(chatType, message, recipient);
              await this.traverse(node, 'exec');
              break;
          }
          case 'action:server_command': {
              const command = await this.resolvePinValue(node, 'command', '');
              if (command) this.context.bot.executeCommand(command);
              await this.traverse(node, 'exec');
              break;
          }
          case 'action:send_log': {
              const message = await this.resolvePinValue(node, 'message', '');
              if (this.botManager?.appendLog && this.context?.botId) {
                  this.botManager.appendLog(this.context.botId, `[Graph] ${message}`);
              } else {
                  console.log(`[Graph] ${message}`);
              }
              await this.traverse(node, 'exec');
              break;
          }
          case 'action:bot_look_at': {
            // --- НАЧАЛО ИЗМЕНЕНИЙ ---
            const target = await this.resolvePinValue(node, 'target'); // Используем новый ID 'target'
            const yOffset = await this.resolvePinValue(node, 'add_y', 0); // Используем новый ID 'add_y'

            if (target && this.context.bot?.lookAt) {
                // Проверяем, есть ли у цели свойство position (значит, это объект entity)
                // или у нее есть x, y, z (значит, это объект Vec3 или похожий)
                let finalPosition;
                if (target.position) {
                    finalPosition = { ...target.position }; // Копируем, чтобы не изменять исходный объект
                } else if (target.x !== undefined && target.y !== undefined && target.z !== undefined) {
                    finalPosition = { ...target };
                }

                if (finalPosition) {
                    // Применяем смещение, если оно указано
                    finalPosition.y += Number(yOffset || 0);
                    this.context.bot.lookAt(finalPosition);
                }
            }
            // --- КОНЕЦ ИЗМЕНЕНИЙ ---
            await this.traverse(node, 'exec');
            break;
        }
          case 'flow:branch': {
              const condition = await this.resolvePinValue(node, 'condition', false);
              await this.traverse(node, condition ? 'exec_true' : 'exec_false');
              break;
          }
          case 'flow:sequence': {
              const pinCount = node.data?.pinCount || 2;
              for (let i = 0; i < pinCount; i++) {
                  await this.traverse(node, `exec_${i}`);
              }
              break;
          }
          case 'variable:set': {
              const varName = await this.resolvePinValue(node, 'name', '');
              const varValue = await this.resolvePinValue(node, 'value');
              const shouldPersist = await this.resolvePinValue(node, 'persist', false);

              if (varName) {
                  this.context.variables[varName] = varValue;
                  this.context.persistenceIntent.set(varName, shouldPersist);
              }
              await this.traverse(node, 'exec');
              break;
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

      let result;

      switch (node.type) {
          case 'event:command': result = this.context[pinId]; break;
          case 'event:chat': result = pinId === 'user' ? { username: this.context.username } : this.context[pinId]; break;
          case 'event:playerJoined':
          case 'event:playerLeft':
              result = this.context[pinId];
              break;
          case 'event:entitySpawn':
          case 'event:entityMoved':
          case 'event:entityGone':
              result = this.context[pinId];
              break;
          
          case 'variable:get':
              const varName = await this.resolvePinValue(node, 'name', '');
              result = this.context.variables.hasOwnProperty(varName) ? this.context.variables[varName] : null;
              break;
          
          case 'math:add': {
              const rawA = await this.resolvePinValue(node, 'a', 0);
              const rawB = await this.resolvePinValue(node, 'b', 0);
              const numA = Number(rawA);
              const numB = Number(rawB);
              if (rawA !== '' && rawB !== '' && !isNaN(numA) && !isNaN(numB)) {
                  result = numA + numB;
              } else {
                  result = String(rawA ?? '') + String(rawB ?? '');
              }
              break;
          }

          case 'data:get_entity_field': {
              const entity = await this.resolvePinValue(node, 'entity');
              result = entity ? entity[pinId] : defaultValue;
              break;
          }

          case 'data:cast': {
              const value = await this.resolvePinValue(node, 'value');
              const targetType = node.data?.targetType || 'String';
              switch (targetType) {
                  case 'String': result = String(value ?? ''); break;
                  case 'Number': result = Number(value); if (isNaN(result)) result = 0; break;
                  case 'Boolean': result = ['true', '1', 'yes'].includes(String(value).toLowerCase()); break;
                  default: result = value;
              }
              break;
          }

          case 'string:contains': {
              const strA = String(await this.resolvePinValue(node, 'a', ''));
              const strB = String(await this.resolvePinValue(node, 'b', ''));
              const caseSensitive = await this.resolvePinValue(node, 'case_sensitive', true);
              result = caseSensitive ? strA.includes(strB) : strA.toLowerCase().includes(strB.toLowerCase());
              break;
          }
          case 'string:matches': {
              const str = String(await this.resolvePinValue(node, 'input', ''));
              const regexStr = String(await this.resolvePinValue(node, 'regex', ''));
              try {
                  result = new RegExp(regexStr).test(str);
              } catch (e) { result = false; }
              break;
          }
          case 'logic:and': {
               const a = await this.resolvePinValue(node, 'a', false);
               const b = await this.resolvePinValue(node, 'b', false);
               result = a && b;
               break;
          }
          case 'logic:or': {
               const a = await this.resolvePinValue(node, 'a', false);
               const b = await this.resolvePinValue(node, 'b', false);
               result = a || b;
               break;
          }
          case 'logic:not': {
               const a = await this.resolvePinValue(node, 'a', false);
               result = !a;
               break;
          }

          case 'data:string_literal':
              result = await this.resolvePinValue(node, 'value', '');
              break;

          case 'data:get_user_field': {
               const user = await this.resolvePinValue(node, 'user');
               result = user ? user[pinId] : defaultValue;
               break;
          }
          case 'data:get_argument': {
              const args = await this.resolvePinValue(node, 'args', {});
              const argName = await this.resolvePinValue(node, 'arg_name', '');
              result = args && argName && args[argName] !== undefined ? args[argName] : null;
              break;
          }
          case 'data:concat_strings': {
               const strA = await this.resolvePinValue(node, 'a', '');
               const strB = await this.resolvePinValue(node, 'b', '');
               result = String(strA ?? '') + String(strB ?? '');
               break;
          }
          case 'data:get_server_players':
              result = this.context.players || [];
              break;
          case 'data:get_bot_look':
              result = this.context.botState ? { yaw: this.context.botState.yaw, pitch: this.context.botState.pitch } : null;
              break;

          case 'array:get_random_element': {
              const arr = await this.resolvePinValue(node, 'array', []);
              result = (!Array.isArray(arr) || arr.length === 0) ? null : arr[Math.floor(Math.random() * arr.length)];
              break;
          }
          case 'array:add_element': {
              const arr = await this.resolvePinValue(node, 'array', []);
              const element = await this.resolvePinValue(node, 'element', null);
              result = Array.isArray(arr) ? [...arr, element] : [element];
              break;
          }
          case 'array:remove_by_index': {
              const arr = await this.resolvePinValue(node, 'array', []);
              const index = await this.resolvePinValue(node, 'index', -1);
              if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
                  result = arr || [];
              } else {
                  const newArr = [...arr];
                  newArr.splice(index, 1);
                  result = newArr;
              }
              break;
          }
          case 'array:get_by_index': {
              const arr = await this.resolvePinValue(node, 'array', []);
              const index = await this.resolvePinValue(node, 'index', -1);
              result = (!Array.isArray(arr) || index < 0 || index >= arr.length) ? null : arr[index];
              break;
          }
          case 'array:find_index': {
              const arr = await this.resolvePinValue(node, 'array', []);
              const element = await this.resolvePinValue(node, 'element', null);
              result = Array.isArray(arr) ? arr.indexOf(element) : -1;
              break;
          }
          
          default:
              result = defaultValue;
              break;
      }

      this.memo.set(cacheKey, result);
      return result;
  }
}

module.exports = GraphExecutionEngine;