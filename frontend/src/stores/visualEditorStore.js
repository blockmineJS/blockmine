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

export const useVisualEditorStore = create(
  immer((set, get) => ({
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

    init: async (botId, id, type) => {
      set({ isLoading: true, editorType: type, variables: [], commandArguments: [] });
      try {
        const [availableNodesData, permissionsData] = await Promise.all([
          get().fetchAvailableNodes(botId, type),
          get().fetchPermissions(botId)
        ]);

        let itemData, graph;
        let finalCommandState;

        if (type === 'command') {
          const managementData = await get().fetchManagementData(botId);
          itemData = managementData.commands.find(c => c.id === parseInt(id));
          if (!itemData) throw new Error('Команда не найдена');
          set({ chatTypes: managementData.chatTypes });
          const commandArgs = itemData.argumentsJson ? JSON.parse(itemData.argumentsJson) : [];
          set({ commandArguments: commandArgs });
          finalCommandState = itemData;
        } else {
          itemData = await apiHelper(`/api/bots/${botId}/event-graphs/${id}`);
          if (!itemData) throw new Error('Граф события не найден');
          const variables = itemData.variables ? (typeof itemData.variables === 'string' ? JSON.parse(itemData.variables) : itemData.variables) : [];
          const triggers = itemData.triggers ? (typeof itemData.triggers === 'string' ? JSON.parse(itemData.triggers) : itemData.triggers) : [];
          finalCommandState = { ...itemData, variables, triggers };
        }

        const parsedGraph = itemData.graphJson ? JSON.parse(itemData.graphJson) : null;
        graph = parsedGraph || { nodes: [], edges: [] };

        set({
          command: finalCommandState,
          availableNodes: availableNodesData,
          permissions: permissionsData,
          variables: finalCommandState.variables || [],
        });

        const reactFlowEdges = (graph.connections || []).map(conn => ({
          id: conn.id,
          source: conn.sourceNodeId,
          target: conn.targetNodeId,
          sourceHandle: conn.sourcePinId,
          targetHandle: conn.targetPinId,
        }));

        const initialNodes = (graph.nodes || []).map(node => {
          if (type === 'event') {
            return { ...node, deletable: true };
          }
          if (node.type === 'event:command') {
            return { ...node, deletable: false };
          }
          return { ...node, deletable: true };
        });

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

    onConnect: (connection) => {
      set(state => {
        state.edges = addEdge(connection, state.edges);
        state.connectingPin = null;
      });
    },

    addNode: (type, position, shouldUpdateState = true) => {
      const defaultData = {};
      if (type === 'string:concat' || type === 'logic:operation' || type === 'flow:sequence') {
          defaultData.pinCount = 2;
      }
      if (type === 'data:array_literal' || type === 'data:make_object') {
          defaultData.pinCount = 0;
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

    updateNodeData: (nodeId, newData) => {
      set(state => {
        const nodeToUpdate = state.nodes.find(node => node.id === nodeId);
        if (nodeToUpdate) {
            nodeToUpdate.data = { ...nodeToUpdate.data, ...newData };
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

        const sourcePin = sourceNodeConfig.outputs.find(p => p.id === connectingPin.pinId);
        const targetPin = targetNodeConfig.inputs.find(p => p.type === sourcePin.type || p.type === 'Wildcard' || sourcePin.type === 'Wildcard');

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

    saveGraph: async (botId) => {
      set({ isSaving: true });
      try {
        const { editorType, command, nodes, edges } = get();
        if (!command) {
          throw new Error("Нет данных о команде или событии.");
        }
        const id = command.id;

        const graphJson = {
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data || {},
          })),
          connections: edges.map(edge => ({
            id: edge.id,
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            sourcePinId: edge.sourceHandle,
            targetPinId: edge.targetHandle,
          })),
        };
        
        const payload = {
          name: command.name,
          isEnabled: command.isEnabled,
          graphJson: JSON.stringify(graphJson),
        };

        if (editorType === 'command') {
          payload.argumentsJson = command.argumentsJson || '[]';
          payload.description = command.description;
          payload.cooldown = command.cooldown;
          payload.aliases = command.aliases;
          payload.permissionId = command.permissionId;
          payload.allowedChatTypes = JSON.stringify(command.allowedChatTypes || []);
        } else { 
          payload.variables = command.variables || [];
          payload.triggers = (command.triggers || []).map(t => t.eventType);
        }
        
        Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

        const url = editorType === 'command'
          ? `/api/bots/${botId}/commands/${command.id}`
          : `/api/bots/${botId}/event-graphs/${id}`;
          
        const method = 'PUT';

        await apiHelper(url, { method, body: JSON.stringify(payload) });
        
        toast({ title: "Успех!", description: "Граф успешно сохранен!" });

      } catch (error) {
        console.error("Ошибка сохранения графа:", error);
        toast({ variant: 'destructive', title: "Ошибка сохранения", description: error.message });
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
  }))
);
