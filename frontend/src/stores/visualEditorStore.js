import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { apiHelper } from '@/lib/api';

export const useVisualEditorStore = create((set, get) => ({
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

  init: async (botId, id, type) => { // type is now required
    set({ isLoading: true, editorType: type }); // Устанавливаем тип
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
        finalCommandState = itemData;
      } else { // event
        itemData = await apiHelper(`/api/bots/${botId}/event-graphs/${id}`);
        if (!itemData) throw new Error('Граф события не найден');
        const variables = itemData.variables ? JSON.parse(itemData.variables) : [];
        finalCommandState = { ...itemData, variables };
      }

      const parsedGraph = itemData.graphJson ? JSON.parse(itemData.graphJson) : null;
      graph = parsedGraph || { nodes: [], edges: [] };

      set({ 
        command: finalCommandState, // reusing 'command' state for simplicity
        availableNodes: availableNodesData,
        permissions: permissionsData,
      });

      const reactFlowEdges = (graph.connections || []).map(conn => ({
        id: conn.id,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourcePinId,
        targetHandle: conn.targetPinId,
      }));

      const initialNodes = (graph.nodes || []).map(node => {
        // For event graphs, ensure all nodes are deletable, overriding any stale saved state.
        if (type === 'event') {
          return { ...node, deletable: true };
        }
        // For command graphs, only the 'event:command' trigger is non-deletable.
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
      set({ isLoading: false });
    }
  },

  fetchCommand: async (botId, commandId) => {
    const allData = await apiHelper(`/api/bots/${botId}/management-data`);
    const command = allData.commands.find(c => c.id === parseInt(commandId));
    if (!command) throw new Error('Команда не найдена');
    set({ chatTypes: allData.chatTypes }); // Сохраняем chatTypes
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
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ 
      edges: addEdge(connection, get().edges), 
      connectingPin: null 
    });
  },

  onDelete: (nodesToRemove, edgesToRemove) => {
    const nodes = get().nodes;
    const edges = get().edges;

    const deletableNodes = nodesToRemove.filter(node => node.type !== 'event:command');
    const deletableNodeIds = deletableNodes.map(node => node.id);

    const nextNodes = nodes.filter(node => !deletableNodeIds.includes(node.id));
    const nextEdges = edges.filter(edge => 
        !deletableNodeIds.includes(edge.source) && 
        !deletableNodeIds.includes(edge.target) &&
        !edgesToRemove.some(e => e.id === edge.id)
    );

    set({ nodes: nextNodes, edges: nextEdges });
  },

  addNode: (type, position, shouldUpdateState = true) => {
    const newNode = {
      id: `${type}-${crypto.randomUUID()}`,
      type,
      position,
      data: {},
    };

    if (shouldUpdateState) {
      set(state => ({ nodes: [...state.nodes, newNode] }));
    }
    return newNode;
  },

  duplicateNode: (nodeId) => {
      const originalNode = get().nodes.find(n => n.id === nodeId);
      if (!originalNode || originalNode.type === 'event:command') return;

      const newNode = {
          ...originalNode,
          id: `${originalNode.type}-${crypto.randomUUID()}`,
          position: {
              x: originalNode.position.x + 30,
              y: originalNode.position.y + 30,
          },
          data: { ...originalNode.data },
          selected: true,
      };

      set({ nodes: get().nodes.map(n => ({...n, selected: false })).concat(newNode) });
  },

  appendNode: (newNode) => {
    set(state => ({ nodes: [...state.nodes, newNode] }));
  },

  updateCommand: (updates) => {
    set(state => ({ command: { ...state.command, ...updates } }));
  },

  addArgument: () => {
    set(state => {
      const args = JSON.parse(state.command.argumentsJson || '[]');
      const newArg = { id: crypto.randomUUID(), name: 'newArg', type: 'string', required: true };
      return { command: { ...state.command, argumentsJson: JSON.stringify([...args, newArg]) } };
    });
  },

  updateArgument: (argId, updates) => {
    set(state => {
      const args = JSON.parse(state.command.argumentsJson || '[]');
      const newArgs = args.map(arg => (arg.id === argId ? { ...arg, ...updates } : arg));
      return { command: { ...state.command, argumentsJson: JSON.stringify(newArgs) } };
    });
  },

  removeArgument: (argId) => {
    set(state => {
      const args = JSON.parse(state.command.argumentsJson || '[]');
      const newArgs = args.filter(arg => arg.id !== argId);
      return { command: { ...state.command, argumentsJson: JSON.stringify(newArgs) } };
    });
  },

  addVariable: () => {
    set(state => {
      const variables = state.command.variables || [];
      const newVariable = { id: crypto.randomUUID(), name: 'newVar', type: 'string', value: '' };
      return { command: { ...state.command, variables: [...variables, newVariable] } };
    });
  },

  updateVariable: (varId, updates) => {
    set(state => {
      const variables = state.command.variables || [];
      const newVariables = variables.map(v => {
        if (v.id === varId) {
            const updatedVar = { ...v, ...updates };
            if (updates.type && updates.type !== v.type) {
                switch(updates.type) {
                    case 'string':
                        updatedVar.value = '';
                        break;
                    case 'number':
                        updatedVar.value = '0';
                        break;
                    case 'boolean':
                        updatedVar.value = 'false';
                        break;
                    case 'array':
                        updatedVar.value = '[]';
                        break;
                    default:
                        updatedVar.value = '';
                }
            }
            return updatedVar;
        }
        return v;
      });
      return { command: { ...state.command, variables: newVariables } };
    });
  },

  removeVariable: (varId) => {
    set(state => {
      const variables = state.command.variables || [];
      const newVariables = variables.filter(v => v.id !== varId);
      return { command: { ...state.command, variables: newVariables } };
    });
  },

  updateNodeData: (nodeId, newData) => {
    set(state => {
      const nodeToUpdate = state.nodes.find(node => node.id === nodeId);
      if (!nodeToUpdate) return state;

      const updatedNode = { ...nodeToUpdate, data: { ...nodeToUpdate.data, ...newData } };
      return { nodes: state.nodes.map(node => (node.id === nodeId ? updatedNode : node)) };
    });
  },

  openMenu: (top, left, flowPosition) => set({ isMenuOpen: true, menuPosition: { top, left, flowPosition } }),
  closeMenu: () => set({ isMenuOpen: false, connectingPin: null }),

  setConnectingPin: (pin) => set({ connectingPin: pin }),

  connectAndAddNode: (nodeType, position) => {
    const { connectingPin, availableNodes, nodes, addNode } = get();
    if (!connectingPin) return;

    const sourceNode = nodes.find(n => n.id === connectingPin.nodeId);
    if (!sourceNode) return;

    const newNode = addNode(nodeType, position, false); 

    const allAvailableNodes = Object.values(availableNodes).flat();
    const sourceNodeConfig = allAvailableNodes.find(n => n.type === sourceNode.type);
    const destNodeConfig = allAvailableNodes.find(n => n.type === nodeType);
    if (!sourceNodeConfig || !destNodeConfig) return;

    const sourcePin = sourceNodeConfig.outputs.find(p => p.id === connectingPin.handleId);
    if (!sourcePin) return;

    const destPin = destNodeConfig.inputs.find(p => p.type === sourcePin.type || p.type === 'Wildcard' || sourcePin.type === 'Wildcard');
    if (!destPin) return;

    const newEdge = {
      id: `reactflow__edge-${connectingPin.nodeId}${connectingPin.handleId}-${newNode.id}${destPin.id}`,
      source: connectingPin.nodeId,
      sourceHandle: connectingPin.handleId,
      target: newNode.id,
      targetHandle: destPin.id,
    };

    set(state => ({
      nodes: [...state.nodes, newNode],
      edges: addEdge(newEdge, state.edges),
      isMenuOpen: false,
      connectingPin: null,
    }));
  },

  saveGraph: async (botId) => {
    set({ isSaving: true });
    const { nodes, edges, command, editorType } = get();

    const graphToSave = {
      nodes,
      connections: edges.map(edge => ({
        id: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourcePinId: edge.sourceHandle,
        targetPinId: edge.targetHandle,
      })),
    };
    
    const url = editorType === 'command'
      ? `/api/bots/${botId}/commands/${command.id}`
      : `/api/bots/${botId}/event-graphs/${command.id}`;

    const payload = {
      name: command.name,
      graphJson: JSON.stringify(graphToSave),
      isEnabled: command.isEnabled
    };

    if (editorType === 'command') {
      payload.description = command.description;
      payload.cooldown = command.cooldown;
      payload.aliases = command.aliases;
      payload.permissionId = command.permissionId;
      payload.allowedChatTypes = command.allowedChatTypes;
      payload.argumentsJson = command.argumentsJson;
    } else { // event
      payload.variables = command.variables;
      payload.triggers = command.triggers.map(t => t.eventType || t); // Handle both object and string array
    }

    try {
      await apiHelper(url, { method: 'PUT', body: payload });
    } catch (error) {
      console.error("Ошибка сохранения графа:", error);
    } finally {
      set({ isSaving: false });
    }
  },
}));

