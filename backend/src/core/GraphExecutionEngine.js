const User = require('./UserService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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
          
          if (!this.context.variables) {
            this.context.variables = {};
            if (Array.isArray(this.activeGraph.variables)) {
              for (const variable of this.activeGraph.variables) {
                  let value = variable.value;
                  try {
                      switch(variable.type) {
                          case 'number':
                              value = Number(value);
                              break;
                          case 'boolean':
                              value = value === 'true';
                              break;
                          case 'array':
                              value = JSON.parse(value);
                              break;
                      }
                  } catch (e) {
                      console.error(`Error parsing variable default value for ${variable.name}:`, e);
                  }
                  this.context.variables[variable.name] = value;
              }
            }
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
      const execCacheKey = `${node.id}_executed`;
      if (this.memo.has(execCacheKey)) {
          return;
      }
      this.memo.set(execCacheKey, true);

      switch (node.type) {
          case 'user:set_blacklist': {
              const userObject = await this.resolvePinValue(node, 'user', null);
              const blacklistStatus = await this.resolvePinValue(node, 'blacklist_status', false);
              let updatedUser = null;
              
              if (userObject && userObject.username) {
                  const user = await User.getUser(userObject.username, this.context.botId);
                  if (user) {
                      updatedUser = await prisma.user.update({
                          where: { id: user.id },
                          data: { isBlacklisted: blacklistStatus }
                      });
                      User.clearCache(user.username, this.context.botId);
                  }
              }
              this.memo.set(`${node.id}:updated_user`, updatedUser);
              await this.traverse(node, 'exec');
              break;
          }
          case 'action:send_message': {
              const message = String(await this.resolvePinValue(node, 'message', ''));
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
                  console.log(`[Graph Log] ${message}`);
              }
              await this.traverse(node, 'exec');
              break;
          }
          case 'action:bot_look_at': {
            const target = await this.resolvePinValue(node, 'target');
            const yOffset = await this.resolvePinValue(node, 'add_y', 0);

            if (target && this.context.bot?.lookAt) {
                let finalPosition;
                if (target.position) {
                    finalPosition = { ...target.position };
                } else if (target.x !== undefined && target.y !== undefined && target.z !== undefined) {
                    finalPosition = { ...target };
                }

                if (finalPosition) {
                    finalPosition.y += Number(yOffset || 0);
                    this.context.bot.lookAt(finalPosition);
                }
            }
            await this.traverse(node, 'exec');
            break;
          }
          case 'action:bot_set_variable': {
              const varName = await this.resolvePinValue(node, 'name', '');
              const varValue = await this.resolvePinValue(node, 'value');
              let shouldPersist = await this.resolvePinValue(node, 'persist', false);
              
              if (this.context.eventType === 'command') {
                  shouldPersist = false;
              }

              if (varName) {
                  this.context.variables[varName] = varValue;
                  if (this.context.persistenceIntent) {
                    this.context.persistenceIntent.set(varName, shouldPersist);
                  }
              }
              await this.traverse(node, 'exec');
              break;
          }
          case 'flow:branch': {
              const condition = await this.resolvePinValue(node, 'condition', false);
              await this.traverse(node, condition ? 'exec_true' : 'exec_false');
              break;
          }
          case 'flow:for_each': {
            const array = await this.resolvePinValue(node, 'array', []);
            if (Array.isArray(array)) {
                for (let i = 0; i < array.length; i++) {
                    const element = array[i];
                    this.memo.set(`${node.id}:element`, element);
                    this.memo.set(`${node.id}:index`, i);
                    await this.traverse(node, 'loop_body');
                }
            }
            this.memo.delete(`${node.id}:element`);
            this.memo.delete(`${node.id}:index`);
            await this.traverse(node, 'completed');
            break;
          }
          case 'flow:sequence': {
              const pinCount = node.data?.pinCount || 2;
              for (let i = 0; i < pinCount; i++) {
                  await this.traverse(node, `exec_${i}`);
              }
              break;
          }
          case 'debug:log': {
              const value = await this.resolvePinValue(node, 'value');
              console.log('[Graph Debug]', value);
              await this.traverse(node, 'exec');
              break;
          }
          case 'logic:compare':
            const op = node.data.operation || '==';
            const valA = this.getPinValue(node.id, 'a');
            const valB = this.getPinValue(node.id, 'b');
            let compareResult;
            switch (op) {
              case '==': compareResult = valA == valB; break;
              case '!=': compareResult = valA != valB; break;
              case '>': compareResult = valA > valB; break;
              case '<': compareResult = valA < valB; break;
              case '>=': compareResult = valA >= valB; break;
              case '<=': compareResult = valA <= valB; break;
              default: compareResult = false;
            }
            this.setPinValue(node.id, 'result', compareResult);
            break;
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
          case 'user:check_blacklist': {
              const userIdentifier = await this.resolvePinValue(node, 'user', null);
              let isBlacklisted = false;
              let usernameToFind = null;

              if (typeof userIdentifier === 'string') {
                  usernameToFind = userIdentifier;
              } else if (userIdentifier && typeof userIdentifier === 'object' && userIdentifier.username) {
                  usernameToFind = userIdentifier.username;
              }
    
              if (usernameToFind) {
                  const user = await User.getUser(usernameToFind, this.context.botId);
                  if (user) {
                      isBlacklisted = user.isBlacklisted;
                  }
              }
              result = isBlacklisted;
              break;
          }
          case 'user:get_groups': {
              const userIdentifier = await this.resolvePinValue(node, 'user', null);
              let groups = [];
              let usernameToFind = null;

              if (typeof userIdentifier === 'string') {
                  usernameToFind = userIdentifier;
              } else if (userIdentifier && typeof userIdentifier === 'object' && userIdentifier.username) {
                  usernameToFind = userIdentifier.username;
              }
    
              if (usernameToFind) {
                  const user = await User.getUser(usernameToFind, this.context.botId);
                  if (user && user.groups) {
                      groups = user.groups.map(g => g.group.name);
                  }
              }
              result = groups;
              break;
          }
          case 'user:get_permissions': {
              const userIdentifier = await this.resolvePinValue(node, 'user', null);
              let permissions = [];
              let usernameToFind = null;

              if (typeof userIdentifier === 'string') {
                  usernameToFind = userIdentifier;
              } else if (userIdentifier && typeof userIdentifier === 'object' && userIdentifier.username) {
                  usernameToFind = userIdentifier.username;
              }
    
              if (usernameToFind) {
                  const user = await User.getUser(usernameToFind, this.context.botId);
                  if (user && user.permissionsSet) {
                      permissions = Array.from(user.permissionsSet);
                  }
              }
              result = permissions;
              break;
          }
          case 'bot:get_position': {
            if (this.context.bot?.entity?.position) {
                result = this.context.bot.entity.position;
            } else {
                result = null;
            }
            break;
          }
          case 'user:set_blacklist':
              result = this.memo.get(`${node.id}:updated_user`);
              break;
          case 'event:command':
              if (pinId === 'args') result = this.context.args || {};
              else if (pinId === 'user') result = this.context.user || {};
              else if (pinId === 'chat_type') result = this.context.typeChat || 'local';
              else result = this.context[pinId];
              break;
          case 'event:chat':
              if (pinId === 'user') result = { username: this.context.username };
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
          
          case 'data:get_variable':
              const varName = node.data?.variableName || '';
              result = this.context.variables.hasOwnProperty(varName) ? this.context.variables[varName] : null;
              break;
          
          case 'data:get_argument': {
            const args = this.context.args || {};
            const argName = node.data?.argumentName || '';
            if (pinId === 'value') {
                result = args && argName && args[argName] !== undefined ? args[argName] : defaultValue;
            } else if (pinId === 'exists') {
                result = args && argName && args[argName] !== undefined;
            }
            break;
          }
          
          case 'data:length': {
              const data = await this.resolvePinValue(node, 'data');
              if (Array.isArray(data) || typeof data === 'string') {
                  result = data.length;
              } else {
                  result = 0;
              }
              break;
          }
          
          case 'math:operation': {
              const op = node.data?.operation || '+';
              const a = Number(await this.resolvePinValue(node, 'a', 0));
              const b = Number(await this.resolvePinValue(node, 'b', 0));
              switch (op) {
                  case '+': result = a + b; break;
                  case '-': result = a - b; break;
                  case '*': result = a * b; break;
                  case '/': result = b !== 0 ? a / b : 0; break;
                  default: result = 0;
              }
              break;
          }

          case 'math:random_number': {
             const minRaw = await this.resolvePinValue(node, 'min', node.data.min ?? '0');
             const maxRaw = await this.resolvePinValue(node, 'max', node.data.max ?? '1');

             const minStr = String(minRaw);
             const maxStr = String(maxRaw);

             const min = parseFloat(minStr.replace(',', '.'));
             const max = parseFloat(maxStr.replace(',', '.'));

             if (isNaN(min) || isNaN(max)) {
                 result = NaN;
                 break;
             }
            
             const produceFloat = minStr.includes('.') || minStr.includes(',') || !Number.isInteger(min) ||
                                  maxStr.includes('.') || maxStr.includes(',') || !Number.isInteger(max);

             if (produceFloat) {
                 result = Math.random() * (max - min) + min;
             } else {
                 const minInt = Math.ceil(min);
                 const maxInt = Math.floor(max);
                 result = Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
             }
             break;
          }

          case 'logic:operation': {
            const op = node.data?.operation || 'AND';
            const inputs = [];
            for (const key in node.data) {
                if (key.startsWith('pin_')) {
                    inputs.push(await this.resolvePinValue(node, key, false));
                }
            }
            if (inputs.length === 0) {
                inputs.push(await this.resolvePinValue(node, 'a', false));
                inputs.push(await this.resolvePinValue(node, 'b', false));
            }


            switch (op) {
                case 'AND': result = inputs.every(Boolean); break;
                case 'OR': result = inputs.some(Boolean); break;
                case 'NOT': result = !inputs[0]; break;
                default: result = false;
            }
            break;
          }

          case 'string:concat': {
            const pinCount = node.data?.pinCount || 2;
            let finalString = '';
            for (let i = 0; i < pinCount; i++) {
                const part = await this.resolvePinValue(node, `pin_${i}`, '');
                finalString += String(part ?? '');
            }
            result = finalString;
            break;
          }

          case 'data:array_literal': {
            const numPins = node.data?.pinCount || 0;
            const items = [];
            for (let i = 0; i < numPins; i++) {
                items.push(await this.resolvePinValue(node, `pin_${i}`));
            }
            result = items;
            break;
          }

          case 'data:make_object': {
              const numPins = node.data?.pinCount || 0;
              const obj = {};
              for (let i = 0; i < numPins; i++) {
                  const key = node.data[`key_${i}`];
                  if (key) {
                      obj[key] = await this.resolvePinValue(node, `value_${i}`);
                  }
              }
              result = obj;
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
          case 'data:string_literal':
              result = await this.resolvePinValue(node, 'value', '');
              break;

          case 'data:get_user_field': {
               const user = await this.resolvePinValue(node, 'user');
               result = user ? user[pinId] : defaultValue;
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
              if (!Array.isArray(arr) || arr.length === 0) {
                  result = null;
              } else {
                  const randomIndex = Math.floor(Math.random() * arr.length);
                  // Чтобы не вычислять дважды, сохраняем индекс в memo
                  this.memo.set(`${node.id}:index`, randomIndex);
                  if (pinId === 'element') {
                      result = arr[randomIndex];
                  } else if (pinId === 'index') {
                      result = randomIndex;
                  }
              }
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

      this.memo.set(cacheKey, result);
      return result;
  }
}

module.exports = GraphExecutionEngine;