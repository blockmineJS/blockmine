import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import { apiHelper } from '@/lib/api';
import { toast } from "@/hooks/use-toast";
import { randomUUID } from '@/lib/uuid';
import { getConversionChain, createConverterNode } from '@/lib/typeConversionHelper';
import { debounce } from '@/lib/debounce';

export const useVisualEditorStore = create(
  immer((set, get) => {
    const debouncedSaveGraph = debounce(() => {
      get().saveGraph();
    }, 1000);

    return {
    nodes: [],
    edges: [],
    command: null,
    isLoading: true,
    isSaving: false,
    editorType: 'command',
    availableNodes: {},
    permissions: [],
    chatTypes: [],
    isMenuOpen: false,
    menuPosition: { top: 0, left: 0, flowPosition: { x: 0, y: 0 } },
    connectingPin: null,
    variables: [],
    commandArguments: [],
    availablePlugins: [],

    init: async (botId, id, type) => {
      set({ isLoading: true, editorType: type, variables: [], commandArguments: [] });
      try {
        const [availableNodesData, permissionsData] = await Promise.all([
          get().fetchAvailableNodes(botId, type),
          get().fetchPermissions(botId)
        ]);

        let pluginsData = [];
        try {
          pluginsData = await apiHelper(`/api/plugins/bot/${botId}`);
        } catch (error) {
          console.warn('Не удалось загрузить плагины для назначения владельца:', error.message);
        }

        let itemData, graph;
        let finalCommandState;

        if (id === 'new') {
            if (type === 'command') {
                const managementData = await get().fetchManagementData(botId);
                itemData = {
                    name: 'Новая команда',
                    description: 'Описание новой команды',
                    graphJson: JSON.stringify({ nodes: [], edges: [], variables: [] }),
                    argumentsJson: '[]',
                    isEnabled: true,
                    cooldown: 0,
                    allowedChatTypes: '["chat", "private"]'
                };
                 set({ chatTypes: managementData.chatTypes });
            } else {
                 itemData = {
                    name: 'Новый граф',
                    graphJson: JSON.stringify({ nodes: [], edges: [], variables: [] }),
                    variables: '[]',
                    triggers: '[]',
                    isEnabled: true
                };
            }
        } else {
            if (type === 'command') {
              const managementData = await get().fetchManagementData(botId);
              itemData = managementData.commands.find(c => c.id === parseInt(id));
              set({ chatTypes: managementData.chatTypes });
            } else {
              itemData = await apiHelper(`/api/bots/${botId}/event-graphs/${id}`);
            }
        }
        
        if (!itemData) {
            throw new Error(type === 'command' ? 'Команда не найдена.' : 'Граф события не найден.');
        }

        let parsedGraph;
        try {
            parsedGraph = itemData.graphJson ? JSON.parse(itemData.graphJson) : null;
        } catch (e) {
            console.error("Ошибка парсинга graphJson:", e);
            parsedGraph = null;
        }

        if (!parsedGraph) {
            parsedGraph = { nodes: [], edges: [], variables: [] };
        }
        parsedGraph.variables = parsedGraph.variables || [];
        
        const commandArgs = (itemData.argumentsJson && JSON.parse(itemData.argumentsJson)) || [];
        const triggers = (itemData.triggers && (typeof itemData.triggers === 'string' ? JSON.parse(itemData.triggers) : itemData.triggers)) || [];
        
        const finalVariables = parsedGraph.variables;

        finalCommandState = { ...itemData, variables: finalVariables, triggers, arguments: commandArgs };
        graph = parsedGraph;
        


        set({
            command: finalCommandState,
            availableNodes: availableNodesData,
            permissions: permissionsData,
            availablePlugins: pluginsData,
            variables: finalVariables,
            commandArguments: commandArgs,
        });

        const reactFlowEdges = (graph.connections || []).map(conn => ({
          id: conn.id,
          source: conn.sourceNodeId,
          target: conn.targetNodeId,
          sourceHandle: conn.sourcePinId,
          targetHandle: conn.targetPinId,
        }));

        let initialNodes = (graph.nodes || []).map(node => {
          if (type === 'event') {
            return { ...node, deletable: true };
          }
          if (node.type === 'event:command') {
            return { ...node, deletable: false };
          }
          return { ...node, deletable: true };
        });

        if (type === 'command' && initialNodes.every(n => n.type !== 'event:command')) {
            initialNodes.unshift({
                id: 'start',
                type: 'event:command',
                position: { x: 100, y: 100 },
                deletable: false,
            });
        }

        set({
          nodes: initialNodes,
          edges: reactFlowEdges,
          isLoading: false,
        });
      } catch (error) {
        console.error("Ошибка инициализации редактора:", error);
        toast({ variant: 'destructive', title: 'Ошибка загрузки', description: error.message });
        set({ isLoading: false });
      }
    },

    fetchCommand: async (botId, commandId) => {
      const allData = await apiHelper(`/api/bots/${botId}/management-data`);
      const command = allData.commands.find(c => c.id === parseInt(commandId));
      if (!command) throw new Error('Команда не найдена');
      set({ chatTypes: allData.chatTypes });
      return command;
    },

    fetchAvailableNodes: async (botId, graphType) => {
      return await apiHelper(`/api/bots/${botId}/visual-editor/nodes?graphType=${graphType}`);
    },

    fetchPermissions: async (botId) => {
      return await apiHelper(`/api/bots/${botId}/visual-editor/permissions`);
    },

    fetchManagementData: async (botId) => {
      return await apiHelper(`/api/bots/${botId}/management-data`);
    },

    onNodesChange: (changes) => {
      set(state => {
        const deletableChanges = changes.filter(change => {
          if (change.type === 'remove') {
            const nodeToRemove = state.nodes.find(n => n.id === change.id);
            return nodeToRemove?.deletable !== false;
          }
          return true;
        });
        state.nodes = applyNodeChanges(deletableChanges, state.nodes);
      });
    },

    onEdgesChange: (changes) => {
      set(state => {
        state.edges = applyEdgeChanges(changes, state.edges);
      });
    },

    onConnect: async (connection) => {
      const { nodes, edges, command } = get();
      const botId = command.botId;

      try {
        // Получаем конфигурации source и target нод
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);

        if (!sourceNode || !targetNode) {
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          return;
        }

        const nodeConfigs = await apiHelper(`/api/bots/${botId}/visual-editor/node-config?types[]=${sourceNode.type}&types[]=${targetNode.type}`);
        const sourceNodeConfig = nodeConfigs.find(n => n.type === sourceNode.type);
        const targetNodeConfig = nodeConfigs.find(n => n.type === targetNode.type);

        if (!sourceNodeConfig || !targetNodeConfig) {
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          return;
        }

        const sourcePin = (sourceNodeConfig.pins?.outputs || sourceNodeConfig.outputs || []).find(p => p.id === connection.sourceHandle);
        const targetPin = (targetNodeConfig.pins?.inputs || targetNodeConfig.inputs || []).find(p => p.id === connection.targetHandle);

        if (!sourcePin || !targetPin) {
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          return;
        }

        // Проверяем совместимость типов
        const typesMatch = sourcePin.type === targetPin.type ||
                          sourcePin.type === 'Wildcard' ||
                          targetPin.type === 'Wildcard';

        if (typesMatch) {
          // Типы совместимы, обычное подключение
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          return;
        }

        // Типы несовместимы, пытаемся найти цепочку конвертации
        const conversionChain = getConversionChain(sourcePin.type, targetPin.type, sourceNode);

        if (conversionChain) {
          // Создаем конвертер и подключения
          const result = createConverterNode(
            connection,
            conversionChain,
            sourceNode,
            targetNode,
            get().addNode,
            addEdge,
            nodes,
            edges
          );

          set(state => {
            // Добавляем новые ноды
            result.additionalNodes.forEach(node => {
              state.nodes.push(node);
            });

            // Добавляем новые edges
            result.newEdges.forEach(edge => {
              state.edges = addEdge(edge, state.edges);
            });

            state.connectingPin = null;
          });
        } else {
          // Нет известной цепочки конвертации, делаем обычное подключение
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
        }
      } catch (error) {
        console.error("Ошибка при создании подключения:", error);
        // В случае ошибки делаем обычное подключение
        set(state => {
          state.edges = addEdge(connection, state.edges);
          state.connectingPin = null;
        });
      }
    },

    addNode: (type, position, shouldUpdateState = true) => {
      const defaultData = {};
      if (type === 'string:concat' || type === 'logic:operation' || type === 'flow:sequence') {
          defaultData.pinCount = 2;
      }
      if (type === 'data:array_literal' || type === 'data:make_object') {
          defaultData.pinCount = 0;
      }
      if (type === 'flow:switch') {
          defaultData.caseCount = 0;
      }

      const newNode = {
        id: `${type}-${randomUUID()}`,
        type,
        position,
        data: defaultData,
      };

      if (shouldUpdateState) {
        set(state => { state.nodes.push(newNode) });
      }
      return newNode;
    },

    duplicateNode: (nodeId) => {
      const originalNode = get().nodes.find(n => n.id === nodeId);
      if (!originalNode || originalNode.type === 'event:command') return;

      const newNode = {
        ...originalNode,
        id: `${originalNode.type}-${randomUUID()}`,
        position: {
          x: originalNode.position.x + 30,
          y: originalNode.position.y + 30,
        },
        data: { ...originalNode.data },
        selected: true,
      };

      set(state => {
          state.nodes.forEach(n => n.selected = false);
          state.nodes.push(newNode);
      });
    },

    appendNode: (newNode) => {
      set(state => { state.nodes.push(newNode) });
    },

    updateCommand: (updates) => {
      set(state => {
        state.command = { ...state.command, ...updates };
      });
    },

    updatePluginOwner: async (botId, pluginId) => {
      try {
        const { command, editorType, nodes, edges, variables } = get();
        const entityId = command.id;
        const entityType = editorType === 'event' ? 'event-graphs' : 'commands';
        

        
        const graphObject = {
          nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
          connections: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
            id,
            sourceNodeId: source,
            targetNodeId: target,
            sourcePinId: sourceHandle,
            targetPinId: targetHandle,
          })),
          variables: variables || []
        };

        const payload = {
          pluginOwnerId: pluginId,
          graphJson: JSON.stringify(graphObject)
        };
        
        await apiHelper(`/api/bots/${botId}/${entityType}/${entityId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        
        set(state => {
          if (state.command) {
            state.command.pluginOwnerId = pluginId;
          }
        });
        
        toast({ title: 'Успех', description: 'Плагин-владелец обновлен' });
      } catch (error) {
        console.error('Ошибка обновления плагина-владельца:', error);
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось обновить плагин-владелец' });
      }
    },

    addArgument: () => {
      set(state => {
        const args = JSON.parse(state.command.argumentsJson || '[]');
        const newArg = { id: randomUUID(), name: 'newArg', type: 'string', required: true };
        const newArgs = [...args, newArg];
        state.command.argumentsJson = JSON.stringify(newArgs);
        state.commandArguments = newArgs;
      });
    },

    updateArgument: (argId, updates) => {
      set(state => {
        const args = JSON.parse(state.command.argumentsJson || '[]');
        const newArgs = args.map(arg => (arg.id === argId ? { ...arg, ...updates } : arg));
        state.command.argumentsJson = JSON.stringify(newArgs);
        state.commandArguments = newArgs;
      });
    },

    removeArgument: (argId) => {
      set(state => {
        const args = JSON.parse(state.command.argumentsJson || '[]');
        const newArgs = args.filter(arg => arg.id !== argId);
        state.command.argumentsJson = JSON.stringify(newArgs);
        state.commandArguments = newArgs;
      });
    },

    addVariable: () => {
      set(state => {
        const variables = state.command.variables || [];
        const newVariable = { id: randomUUID(), name: 'newVar', type: 'string', value: '' };
        const newVariables = [...variables, newVariable];
        state.command.variables = newVariables;
        state.variables = newVariables;
      });
    },

    updateVariable: (varId, updates) => {
      set(state => {
        const variables = state.command.variables || [];
        const newVariables = variables.map(v => {
          if (v.id === varId) {
            const updatedVar = { ...v, ...updates };
            if (updates.type && updates.type !== v.type) {
              switch (updates.type) {
                case 'string': updatedVar.value = ''; break;
                case 'number': updatedVar.value = '0'; break;
                case 'boolean': updatedVar.value = 'false'; break;
                case 'array': updatedVar.value = '[]'; break;
                default: updatedVar.value = '';
              }
            }
            return updatedVar;
          }
          return v;
        });
        state.command.variables = newVariables;
        state.variables = newVariables;
      });
    },

    removeVariable: (varId) => {
      set(state => {
        const variables = state.command.variables || [];
        const newVariables = variables.filter(v => v.id !== varId);
        state.command.variables = newVariables;
        state.variables = newVariables;
      });
    },

    updateNodeData: (nodeId, data) => {
      set(state => {
        const nodeToUpdate = state.nodes.find(node => node.id === nodeId);
        if (nodeToUpdate) {
            nodeToUpdate.data = { ...nodeToUpdate.data, ...data };
        }
      });
    },

    openMenu: (top, left, flowPosition) => set({ isMenuOpen: true, menuPosition: { top, left, flowPosition } }),
    closeMenu: () => set({ isMenuOpen: false }),

    onConnectStart: (_, { handleType, nodeId, handleId }) => {
      const node = get().nodes.find(n => n.id === nodeId);
      set({
        connectingPin: {
          type: handleType,
          nodeId: nodeId,
          pinId: handleId,
          nodeType: node?.type
        },
      });
    },

    setConnectingPin: (pin) => set({ connectingPin: pin }),

    connectAndAddNode: async (nodeType, position) => {
      const { connectingPin, addNode, onConnect, command } = get();
      if (!connectingPin) return;

      const botId = command.botId;

      try {
        const nodeConfigs = await apiHelper(`/api/bots/${botId}/visual-editor/node-config?types[]=${connectingPin.nodeType}&types[]=${nodeType}`);
        const sourceNodeConfig = nodeConfigs.find(n => n.type === connectingPin.nodeType);
        const targetNodeConfig = nodeConfigs.find(n => n.type === nodeType);

        if (!sourceNodeConfig || !targetNodeConfig) {
          throw new Error('Не удалось получить конфигурацию узлов.');
        }

        const sourcePin = (sourceNodeConfig.pins?.outputs || sourceNodeConfig.outputs || []).find(p => p.id === connectingPin.pinId);
        const targetPin = (targetNodeConfig.pins?.inputs || targetNodeConfig.inputs || []).find(p => p.type === sourcePin.type || p.type === 'Wildcard' || sourcePin.type === 'Wildcard');

        const newNode = addNode(nodeType, position, false);

        if (sourcePin && targetPin) {
          const newConnection = {
            source: connectingPin.nodeId,
            sourceHandle: connectingPin.pinId,
            target: newNode.id,
            targetHandle: targetPin.id,
          };
          set(state => {
            state.nodes.push(newNode);
            state.edges = addEdge(newConnection, state.edges);
          });
        } else {
          set(state => { state.nodes.push(newNode) });
        }

      } catch (error) {
        console.error("Ошибка при добавлении и подключении узла:", error);
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Ошибка добавления узла.' });
      } finally {
        set({ connectingPin: null });
      }
    },

    saveGraph: async () => {
      set({ isSaving: true });
      try {
        const { command, nodes, edges, editorType, variables } = get();
        const { id, botId, name, description, isEnabled, permissionId, allowedChatTypes, cooldown, aliases, argumentsJson } = command;

        const graphObject = {
          nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
          connections: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
            id,
            sourceNodeId: source,
            targetNodeId: target,
            sourcePinId: sourceHandle,
            targetPinId: targetHandle,
          })),
          variables: variables || []
        };

        const payload = {
          name,
          description,
          isEnabled,
          graphJson: JSON.stringify(graphObject),
          pluginOwnerId: command.pluginOwnerId,
        };



        if (editorType === 'event') {
          payload.eventType = command.eventType;
        } else {
          payload.aliases = aliases;
          payload.cooldown = cooldown;
          payload.permissionId = permissionId;
          payload.allowedChatTypes = allowedChatTypes;
          payload.argumentsJson = argumentsJson;
        }

        const url = editorType === 'command'
          ? `/api/bots/${botId}/commands/${id}`
          : `/api/bots/${botId}/event-graphs/${id}`;

        await apiHelper(url, { method: 'PUT', body: payload });

        toast({ title: 'Успешно', description: 'Граф сохранен.' });
      } catch (error) {
        console.error("Ошибка сохранения графа:", error);
        toast({ variant: 'destructive', title: 'Ошибка', description: `Ошибка сохранения графа: ${error.message}` });
      } finally {
        set({ isSaving: false });
      }
    },

    addDynamicPin: (nodeId) => {
      set(state => {
          const node = state.nodes.find((n) => n.id === nodeId);
          if (!node) return;

          const pinCount = node.data?.pinCount || 0;
          const nextPinCount = pinCount + 1;
          
          let newPinData = { pinCount: nextPinCount };

          if (node.type === 'data:make_object') {
            newPinData[`key_${pinCount}`] = `key${pinCount}`;
            newPinData[`value_${pinCount}`] = null;
          }
          node.data = {...node.data, ...newPinData};
      });
    },

    removeDynamicPin: (nodeId, pinId) => {
        set(state => {
            const node = state.nodes.find((n) => n.id === nodeId);
            if (!node) return;
            
            const pinIndex = parseInt(pinId.match(/_(\d+)$/)[1]);
            const nextData = { ...node.data };
            const currentPinCount = nextData.pinCount || 0;

            for (let i = pinIndex; i < currentPinCount - 1; i++) {
                if (node.type === 'data:make_object') {
                    nextData[`key_${i}`] = nextData[`key_${i + 1}`];
                    nextData[`value_${i}`] = nextData[`value_${i + 1}`];
                } else {
                    nextData[`pin_${i}`] = nextData[`pin_${i + 1}`];
                }
            }

            if (currentPinCount > 0) {
                if (node.type === 'data:make_object') {
                    delete nextData[`key_${currentPinCount - 1}`];
                    delete nextData[`value_${currentPinCount - 1}`];
                } else {
                    delete nextData[`pin_${currentPinCount - 1}`];
                }
            }
            
            nextData.pinCount = Math.max(0, currentPinCount - 1);
            node.data = nextData;
            
            const handlesToRemove = node.type === 'data:make_object' 
                ? [`key_${pinIndex}`, `value_${pinIndex}`]
                : [`pin_${pinIndex}`];

            const edgesToRemove = state.edges.filter(edge => {
                return edge.target === nodeId && handlesToRemove.includes(edge.targetHandle);
            }).map(e => e.id);
            
            state.edges = state.edges.filter(e => !edgesToRemove.includes(e.id));
        });
    },
    
    updateMakeObjectKey: (nodeId, pinIndex, newKey) => {
        set(state => {
            const node = state.nodes.find((n) => n.id === nodeId);
            if (node && node.type === 'data:make_object') {
                node.data[`key_${pinIndex}`] = newKey;
            }
        });
    },
    
    setInitialState: (graphId, graphType, initialGraph) => {
      get().init(graphId, graphType, initialGraph);
    },

    autoSaveGraph: () => {
      debouncedSaveGraph();
    },

    /**
     * Принудительное сохранение графа с очисткой отложенного таймера
     * Вызывается при выгрузке компонента для предотвращения потери изменений
     *
     * Метод flush() теперь автоматически вызывает отложенную функцию,
     * поэтому больше не нужно дополнительно вызывать saveGraph()
     */
    flushSaveGraph: () => {
      if (debouncedSaveGraph.flush) {
        debouncedSaveGraph.flush();
      }
    },
  };
  })
);