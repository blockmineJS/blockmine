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
  isMenuOpen: false,
  menuPosition: { top: 0, left: 0, flowPosition: { x: 0, y: 0 } },

  init: async (botId, commandId) => {
    set({ isLoading: true });
    try {
      const [commandData, availableNodesData, permissionsData] = await Promise.all([
        get().fetchCommand(botId, commandId),
        get().fetchAvailableNodes(botId),
        get().fetchPermissions(botId)
      ]);
      const graph = commandData.graphJson ? JSON.parse(commandData.graphJson) : { nodes: [], connections: [] };
      const reactFlowEdges = (graph.connections || []).map(conn => ({
        id: conn.id,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourcePinId,
        targetHandle: conn.targetPinId,
      }));
      set({
        command: commandData,
        nodes: graph.nodes || [],
        edges: reactFlowEdges,
        availableNodes: availableNodesData,
        permissions: permissionsData,
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
    return command;
  },

  fetchAvailableNodes: async (botId) => {
    return await apiHelper(`/api/bots/${botId}/visual-editor/nodes`);
  },

  fetchPermissions: async (botId) => {
    return await apiHelper(`/api/bots/${botId}/visual-editor/permissions`);
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
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
  closeMenu: () => set({ isMenuOpen: false }),

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
      await apiHelper(`/api/bots/${botId}/commands/${command.id}/visual`, {
        method: 'PUT',
        body: JSON.stringify({ graphJson }),
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

