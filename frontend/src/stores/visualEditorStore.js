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

  // Инициализация редактора
  init: async (botId, commandId) => {
    set({ isLoading: true });
    try {
      const [commandData, availableNodesData] = await Promise.all([
        get().fetchCommand(botId, commandId),
        get().fetchAvailableNodes(botId)
      ]);

      const graph = commandData.graphJson ? JSON.parse(commandData.graphJson) : { nodes: [], connections: [] };
      
      // Преобразуем формат соединений из нашего формата в формат React Flow
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
        edges: reactFlowEdges, // Используем преобразованные данные
        availableNodes: availableNodesData,
        isLoading: false,
      });

    } catch (error) {
      console.error("Ошибка инициализации редактора:", error);
      set({ isLoading: false });
      // Тут можно использовать toast для уведомления пользователя
    }
  },

  // Загрузка данных команды
  fetchCommand: async (botId, commandId) => {
    // Это немного неэффективно, так как management-data уже загружает все команды.
    // В идеале, нужно брать данные из useAppStore, но для простоты сделаем прямой запрос.
    const allData = await apiHelper(`/api/bots/${botId}/management-data`);
    const command = allData.commands.find(c => c.id === parseInt(commandId));
    if (!command) throw new Error('Команда не найдена');
    return command;
  },

  // Загрузка доступных нод
  fetchAvailableNodes: async (botId) => {
    return await apiHelper(`/api/bots/${botId}/visual-editor/nodes`);
  },

  // Обработчики событий React Flow
  onNodesChange: (changes) => {
    const nextChanges = changes.filter(change => {
      if (change.type === 'remove') {
        const nodeToRemove = get().nodes.find(n => n.id === change.id);
        // Запрещаем удаление стартовой ноды
        if (nodeToRemove?.type === 'event:command') {
          console.warn("Нельзя удалить стартовую ноду!"); // Можно показать toast
          return false;
        }
      }
      return true;
    });

    set({
      nodes: applyNodeChanges(nextChanges, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },

  // Добавление новой ноды на холст
  addNode: (type, position) => {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: {},
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  // Обновление данных внутри ноды
  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
  
  // Сохранение графа
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

      const graphJson = JSON.stringify({ 
        nodes, 
        connections
      });

      await apiHelper(`/api/bots/${botId}/commands/${command.id}/visual`, {
        method: 'PUT',
        body: JSON.stringify({ graphJson }),
      });
      // Показать toast об успехе
    } catch (error) {
      console.error("Ошибка сохранения графа:", error);
      // Показать toast об ошибке
    } finally {
      set({ isSaving: false });
    }
  },
}));

