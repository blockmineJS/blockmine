import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow';
import { apiHelper } from '@/lib/api';

export const useVisualEditorStore = create((set, get) => ({
  nodes: [],
  edges: [],
  command: null,
  isLoading: true,
  isSaving: false,
  availableNodes: {},
  permissions: [],
  chatTypes: [],
  isMenuOpen: false,
  menuPosition: { top: 0, left: 0, flowPosition: { x: 0, y: 0 } },
  connectingPin: null,

  init: async (botId, commandId) => {
    set({ isLoading: true });
    try {
      const [managementData, availableNodesData, permissionsData] = await Promise.all([
        get().fetchManagementData(botId),
        get().fetchAvailableNodes(botId),
        get().fetchPermissions(botId)
      ]);

      const commandData = managementData.commands.find(c => c.id === parseInt(commandId));
      if (!commandData) throw new Error('Команда не найдена');

      set({ 
        command: commandData,
        availableNodes: availableNodesData,
        permissions: permissionsData,
        chatTypes: managementData.chatTypes
      });

      const parsedGraph = commandData.graphJson ? JSON.parse(commandData.graphJson) : null;
      const graph = parsedGraph || { nodes: [], connections: [] };
      const reactFlowEdges = (graph.connections || []).map(conn => ({
        id: conn.id,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourcePinId,
        targetHandle: conn.targetPinId,
      }));

      const initialNodes = (graph.nodes || []).map(node => {
        if (node.type === 'event:command') {
          return { ...node, deletable: false, draggable: false };
        }
        return node;
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

  fetchAvailableNodes: async (botId) => {
    return await apiHelper(`/api/bots/${botId}/visual-editor/nodes`);
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
    return newNode; // Возвращаем ноду, чтобы ее можно было использовать
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

  updateNodeData: (nodeId, newData) => {
    set(state => {
      const nodeToUpdate = state.nodes.find(node => node.id === nodeId);
      if (!nodeToUpdate) return state;

      const newPinCount = newData.pinCount;
      if (newPinCount && newPinCount > (nodeToUpdate.data.pinCount || 2)) {
        const newPinId = `pin_${newPinCount - 1}`;
        const newPinName = String.fromCharCode(65 + newPinCount -1); // A, B, C...
        if (!nodeToUpdate.inputs) {
            nodeToUpdate.inputs = [];
        }
        if (!nodeToUpdate.inputs.find(p => p.id === newPinId)) {
            nodeToUpdate.inputs.push({ id: newPinId, name: newPinName, type: 'Boolean', required: true });
        }
      }

      const newEntries = Object.entries(newData);
      const isChanged = newEntries.some(([key, value]) => nodeToUpdate.data[key] !== value);

      if (!isChanged) return state;

      const updatedNodes = state.nodes.map(node =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      );
      
      return { nodes: updatedNodes };
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
    const { command, nodes, edges } = get();
    if (!command) return;
    set({ isSaving: true });
    try {
      const connections = edges.map(edge => ({
        id: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourcePinId: edge.sourceHandle,
        targetPinId: edge.targetHandle,
      }));
      const graphJson = JSON.stringify({ nodes, connections });

      const commandToSave = {
        ...command,
        graphJson: graphJson,
      };

      await apiHelper(`/api/bots/${botId}/commands/${command.id}/visual`, {
        method: 'PUT',
        body: JSON.stringify(commandToSave),
      });
      // Тут хорошо бы показать toast
      console.log("Граф успешно сохранен!");
    } catch (error) {
      console.error("Ошибка сохранения графа:", error);
    } finally {
      set({ isSaving: false });
    }
  },
}));

