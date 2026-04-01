import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
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
import { io } from 'socket.io-client';
import { useAppStore } from './appStore';
import NodeRegistry from '@/components/visual-editor/nodes';

enableMapSet();

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

    // Trace visualization state
    trace: null, // Текущая трассировка для просмотра
    isTraceViewerOpen: false, // Открыт ли TraceViewer
    highlightedNodeIds: new Set(), // Ноды, которые нужно подсветить
    currentActiveNodeId: null, // ID текущей активной ноды в трассировке
    playbackState: {
      isPlaying: false,
      currentStepIndex: -1,
      speed: 1, // 0.5x, 1x, 2x // upd. не используется. по дефолту 1. потом выреать или дополнить
    },

    // Debug system state
    breakpoints: new Map(), // Map<nodeId, Breakpoint>
    debugSession: null, // Текущая сессия отладки
    whatIfOverrides: new Map(), // Map<nodeId:pinId, value>
    debugMode: 'trace', // 'trace' | 'live'
    connectedDebugUsers: [], // Array<{socketId, userId, username}>
    socket: null,

    // Collaborative editing state
    collabUsers: [], // Array<{socketId, username, userId, color}>
    collabCursors: new Map(), // Map<socketId, {x, y, username, color}>
    collabSelections: new Map(), // Map<socketId, {nodeIds: [], username, color}>
    collabConnections: new Map(), // Map<socketId, {fromX, fromY, toX, toY, username, color}>

    // Viewport state (для правильного отображения collaborative курсоров)
    viewport: { x: 0, y: 0, zoom: 1 },

    // Clipboard state (для копирования и вставки нод)
    clipboard: { nodes: [], edges: [] },

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

        let hasMigrations = false;
        let initialNodes = (graph.nodes || []).map(node => {
          // Миграция: action:bot_set_variable variableName -> name
          if (node.type === 'action:bot_set_variable' && node.data?.variableName && !node.data?.name) {
            hasMigrations = true;
            node = {
              ...node,
              data: {
                ...node.data,
                name: node.data.variableName,
                variableName: undefined
              }
            };
            delete node.data.variableName;
          }

          if (type === 'event') {
            return { ...node, deletable: true };
          }
          if (node.type === 'event:command') {
            return { ...node, deletable: false };
          }
          return { ...node, deletable: true };
        });

        // Если произошли миграции, автосохраняем граф
        const invalidNodeCount = initialNodes.filter(node => !node?.type || node.type === 'default').length;
        if (invalidNodeCount > 0) {
          console.warn(`[VisualEditor] Filtered ${invalidNodeCount} invalid node(s) with empty/default type during init`);
          initialNodes = initialNodes.filter(node => node?.type && node.type !== 'default');
        }

        if (hasMigrations) {
          setTimeout(() => {
            const saveFunc = type === 'command' ? get().saveCommand : get().saveEventGraph;
            saveFunc?.();
          }, 500);
        }

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

        // Подключаемся к collaborative socket
        // Передаем callback для инициализации graphState после получения collab:state
        get().connectGraphSocket(() => {
          // Callback вызывается после получения collab:state
          // Если graphState пустой - отправляем наше состояние
          const { nodes, edges, command } = get();
          if (nodes.length > 0 || edges.length > 0) {
            console.log('[Collab] Sending init-graph-state after connection');
            get().socket?.emit('collab:init-graph-state', {
              botId: command.botId,
              graphId: command.id,
              nodes,
              edges,
            });
          }
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

      // Синхронизация с другими пользователями
      const { socket, command } = get();
      if (socket && command) {
        // Отправляем изменения позиций (движение нод)
        const positionChanges = changes.filter(c => c.type === 'position' && c.position);
        if (positionChanges.length > 0) {
          socket.emit('collab:nodes', {
            botId: command.botId,
            graphId: command.id,
            type: 'move',
            data: positionChanges.map(c => ({
              id: c.id,
              position: c.position
            }))
          });
        }

        // Отправляем удаления нод
        const removeChanges = changes.filter(c => c.type === 'remove');
        if (removeChanges.length > 0) {
          socket.emit('collab:nodes', {
            botId: command.botId,
            graphId: command.id,
            type: 'delete',
            data: {
              nodeIds: removeChanges.map(c => c.id)
            }
          });
        }

        // Отправляем выбор нод
        const selectChanges = changes.filter(c => c.type === 'select' && c.selected);
        if (selectChanges.length > 0) {
          const selectedNodeIds = get().nodes.filter(n => n.selected).map(n => n.id);
          socket.emit('collab:selection', {
            botId: command.botId,
            graphId: command.id,
            nodeIds: selectedNodeIds
          });
        }
      }
    },

    onEdgesChange: (changes) => {
      set(state => {
        state.edges = applyEdgeChanges(changes, state.edges);
      });

      // Синхронизация удаления связей с другими пользователями
      const { socket, command } = get();
      if (socket && command) {
        const removeChanges = changes.filter(c => c.type === 'remove');
        if (removeChanges.length > 0) {
          socket.emit('collab:edges', {
            botId: command.botId,
            graphId: command.id,
            type: 'delete',
            data: {
              edgeIds: removeChanges.map(c => c.id)
            }
          });
        }
      }
    },

    onConnect: async (connection) => {
      const { nodes, edges, command, socket } = get();
      const botId = command.botId;

      // Helper function to broadcast edge creation
      const broadcastEdgeCreation = (edge) => {
        if (socket && command) {
          socket.emit('collab:edges', {
            botId: command.botId,
            graphId: command.id,
            type: 'create',
            data: { edge }
          });
        }
      };

      // Helper function to broadcast node creation
      const broadcastNodeCreation = (node) => {
        if (socket && command) {
          socket.emit('collab:nodes', {
            botId: command.botId,
            graphId: command.id,
            type: 'create',
            data: { node }
          });
        }
      };

      try {
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);

        if (!sourceNode || !targetNode) {
          const newEdge = { ...connection, id: connection.id || `reactflow__edge-${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}` };
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          broadcastEdgeCreation(newEdge);
          return;
        }

        const nodeConfigs = await apiHelper(`/api/bots/${botId}/visual-editor/node-config?types[]=${sourceNode.type}&types[]=${targetNode.type}`);
        const sourceNodeConfig = nodeConfigs.find(n => n.type === sourceNode.type);
        const targetNodeConfig = nodeConfigs.find(n => n.type === targetNode.type);

        if (!sourceNodeConfig || !targetNodeConfig) {
          const newEdge = { ...connection, id: connection.id || `reactflow__edge-${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}` };
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          broadcastEdgeCreation(newEdge);
          return;
        }

        const sourcePin = (sourceNodeConfig.pins?.outputs || sourceNodeConfig.outputs || []).find(p => p.id === connection.sourceHandle);
        const targetPin = (targetNodeConfig.pins?.inputs || targetNodeConfig.inputs || []).find(p => p.id === connection.targetHandle);

        if (!sourcePin || !targetPin) {
          const newEdge = { ...connection, id: connection.id || `reactflow__edge-${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}` };
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          broadcastEdgeCreation(newEdge);
          return;
        }

        // Exec-пины могут соединяться ТОЛЬКО с Exec-пинами
        const isExecConnection = sourcePin.type === 'Exec' || targetPin.type === 'Exec';

        let typesMatch;
        if (isExecConnection) {
          // Exec должен соединяться только с Exec
          typesMatch = sourcePin.type === 'Exec' && targetPin.type === 'Exec';
        } else {
          // Для остальных типов - обычная логика с Wildcard
          typesMatch = sourcePin.type === targetPin.type ||
                       sourcePin.type === 'Wildcard' ||
                       targetPin.type === 'Wildcard';
        }

        if (typesMatch) {
          const newEdge = { ...connection, id: connection.id || `reactflow__edge-${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}` };
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          broadcastEdgeCreation(newEdge);
          return;
        }

        // Для Exec-пинов не делаем конвертацию - просто блокируем соединение
        if (isExecConnection) {
          console.warn(`Невозможно соединить Exec-пин с пином типа ${sourcePin.type === 'Exec' ? targetPin.type : sourcePin.type}`);
          set(state => {
            state.connectingPin = null;
          });
          return;
        }

        // Типы несовместимы, пытаемся найти цепочку конвертации
        const conversionChain = getConversionChain(sourcePin.type, targetPin.type, sourceNode);

        if (conversionChain) {
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

          // Broadcast созданные ноды и edges
          result.additionalNodes.forEach(broadcastNodeCreation);
          result.newEdges.forEach(broadcastEdgeCreation);
        } else {
          const newEdge = { ...connection, id: connection.id || `reactflow__edge-${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}` };
          set(state => {
            state.edges = addEdge(connection, state.edges);
            state.connectingPin = null;
          });
          broadcastEdgeCreation(newEdge);
        }
      } catch (error) {
        console.error("Ошибка при создании подключения:", error);
        const newEdge = { ...connection, id: connection.id || `reactflow__edge-${connection.source}${connection.sourceHandle}-${connection.target}${connection.targetHandle}` };
        set(state => {
          state.edges = addEdge(connection, state.edges);
          state.connectingPin = null;
        });
        broadcastEdgeCreation(newEdge);
      }
    },

    addEdgeWaypoint: (edgeId, position) => {
      set(state => ({
        edges: state.edges.map(edge =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  waypoints: [...(edge.data?.waypoints || []), position]
                }
              }
            : edge
        )
      }));
    },

    updateEdgeWaypoint: (edgeId, waypointIndex, position) => {
      set(state => ({
        edges: state.edges.map(edge =>
          edge.id === edgeId && edge.data?.waypoints?.[waypointIndex] !== undefined
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  waypoints: edge.data.waypoints.map((wp, idx) =>
                    idx === waypointIndex ? position : wp
                  )
                }
              }
            : edge
        )
      }));
    },

    removeEdgeWaypoint: (edgeId, waypointIndex) => {
      set(state => ({
        edges: state.edges.map(edge =>
          edge.id === edgeId && edge.data?.waypoints
            ? {
                ...edge,
                data: {
                  ...edge.data,
                  waypoints: edge.data.waypoints.filter((_, idx) => idx !== waypointIndex)
                }
              }
            : edge
        )
      }));
    },

    addNode: (type, position, shouldUpdateState = true) => {
      const definition = type ? NodeRegistry.get(type) : null;
      if (!type || type === 'default' || !definition) {
        console.error('[VisualEditor] Attempted to add invalid node type:', type);
        return null;
      }
      const defaultData = definition?.defaultData ? { ...definition.defaultData } : {};

      if (type === 'string:concat' || type === 'logic:operation' || type === 'flow:sequence') {
          defaultData.pinCount = defaultData.pinCount ?? 2;
      }
      if (type === 'data:array_literal' || type === 'data:make_object') {
          defaultData.pinCount = defaultData.pinCount ?? 0;
      }
      if (type === 'flow:switch') {
          defaultData.caseCount = defaultData.caseCount ?? 0;
      }

      const newNode = {
        id: `${type}-${randomUUID()}`,
        type,
        position,
        data: defaultData,
      };

      if (shouldUpdateState) {
        set(state => { state.nodes.push(newNode) });

        // Broadcast создания ноды
        const { socket, command } = get();
        if (socket && command) {
          socket.emit('collab:nodes', {
            botId: command.botId,
            graphId: command.id,
            type: 'create',
            data: { node: newNode }
          });
        }
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

      // Broadcast создания дубликата ноды
      const { socket, command } = get();
      if (socket && command) {
        socket.emit('collab:nodes', {
          botId: command.botId,
          graphId: command.id,
          type: 'create',
          data: { node: newNode }
        });
      }
    },

    copyNodes: () => {
      const { nodes, edges } = get();
      const selectedNodes = nodes.filter(n => n.selected && n.type !== 'event:command');


      if (selectedNodes.length === 0) {
        return;
      }

      const selectedNodeIds = new Set(selectedNodes.map(n => n.id));

      // Копируем связи между выбранными нодами
      const selectedEdges = edges.filter(e =>
        selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
      );

      set({
        clipboard: {
          nodes: selectedNodes.map(n => ({
            ...n,
            data: { ...n.data }
          })),
          edges: selectedEdges
        }
      });

    },

    pasteNodes: (cursorPosition = null) => {
      const { clipboard, nodes, socket, command } = get();

      if (clipboard.nodes.length === 0) {
        return;
      }

      let offsetX = 50;
      let offsetY = 50;

      if (cursorPosition && clipboard.nodes.length > 0) {
        const firstNode = clipboard.nodes[0];
        offsetX = cursorPosition.x - firstNode.position.x;
        offsetY = cursorPosition.y - firstNode.position.y;
      }

      const idMap = new Map();
      const newNodes = clipboard.nodes.map(node => {
        const newId = `${node.type}-${randomUUID()}`;
        idMap.set(node.id, newId);

        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + offsetX,
            y: node.position.y + offsetY,
          },
          selected: true,
        };
      });

      const newEdges = clipboard.edges.map(edge => ({
        ...edge,
        id: `reactflow__edge-${idMap.get(edge.source)}${edge.sourceHandle}-${idMap.get(edge.target)}${edge.targetHandle}`,
        source: idMap.get(edge.source),
        target: idMap.get(edge.target),
      }));

      set(state => {
        state.nodes.forEach(n => n.selected = false);

        state.nodes.push(...newNodes);
        state.edges.push(...newEdges);
      });


      // Broadcast создания нод и связей
      if (socket && command) {
        newNodes.forEach(node => {
          socket.emit('collab:nodes', {
            botId: command.botId,
            graphId: command.id,
            type: 'create',
            data: { node }
          });
        });

        newEdges.forEach(edge => {
          socket.emit('collab:edges', {
            botId: command.botId,
            graphId: command.id,
            type: 'create',
            data: { edge }
          });
        });
      }
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

      // Broadcast изменения данных ноды
      const { socket, command } = get();
      if (socket && command) {
        socket.emit('collab:nodes', {
          botId: command.botId,
          graphId: command.id,
          type: 'update',
          data: {
            nodeId,
            nodeData: data
          }
        });
      }
    },

    openMenu: (top, left, flowPosition) => set({ isMenuOpen: true, menuPosition: { top, left, flowPosition } }),
    closeMenu: () => set({ isMenuOpen: false }),

    onConnectStart: (_, { handleType, nodeId, handleId }) => {
      const node = get().nodes.find(n => n.id === nodeId);

      // Получаем тип пина из определения ноды
      let pinType = null;
      if (node) {
        const definition = NodeRegistry.get(node.type);
        if (definition) {
          const { variables, commandArguments } = get();
          const context = { variables, commandArguments };
          const pins = handleType === 'source'
            ? definition.getOutputs(node.data, context)
            : definition.getInputs(node.data, context);
          const pin = pins.find(p => p.id === handleId);
          pinType = pin?.type || null;
        }
      }

      set({
        connectingPin: {
          handleType: handleType,
          nodeId: nodeId,
          pinId: handleId,
          nodeType: node?.type,
          pinType: pinType
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
        if (!newNode) {
          return;
        }

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

        // Отправляем событие для hot reload графов (только для event-графов)
        const { socket } = get();
        if (socket && editorType === 'event') {
          console.log('[Graph Hot Reload] Sending graph:updated event...');
          socket.emit('graph:updated', { botId, graphId: id });
        }

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

    // Trace visualization methods
    setTrace: (trace) => {
      set({ trace });
    },

    openTraceViewer: (trace) => {
      const executionSteps = trace.steps.filter(step => step.type !== 'traversal');
      const lastStepIndex = executionSteps.length > 0 ? executionSteps.length - 1 : -1;

      // Вычисляем подсветку для последнего шага
      const nodeIds = new Set();
      let currentActiveNodeId = null;
      if (lastStepIndex >= 0) {
        const steps = executionSteps.slice(0, lastStepIndex + 1);
        for (const step of steps) {
          if (step.nodeId && step.status === 'executed') {
            nodeIds.add(step.nodeId);
          }
        }
        // Устанавливаем последнюю ноду как активную
        currentActiveNodeId = executionSteps[lastStepIndex]?.nodeId || null;
      }

      set({
        trace,
        isTraceViewerOpen: true,
        highlightedNodeIds: nodeIds,
        currentActiveNodeId,
        playbackState: {
          isPlaying: false,
          currentStepIndex: lastStepIndex,
          speed: 1,
        },
      });

      // Переключаемся в режим просмотра трассировки
      get().setDebugMode('trace');
    },

    closeTraceViewer: () => {
      set({
        trace: null,
        isTraceViewerOpen: false,
        highlightedNodeIds: new Set(),
        currentActiveNodeId: null,
        playbackState: {
          isPlaying: false,
          currentStepIndex: -1,
          speed: 1,
        },
      });

      // Возвращаемся в обычный режим
      get().setDebugMode('normal');
    },

    playTrace: () => {
      set(state => {
        state.playbackState.isPlaying = true;
      });
    },

    pauseTrace: () => {
      set(state => {
        state.playbackState.isPlaying = false;
      });
    },

    setTraceStep: (stepIndex) => {
      set(state => {
        state.playbackState.currentStepIndex = stepIndex;

        // Обновляем подсветку нод на основе текущего шага
        // Фильтруем только шаги выполнения (без traversals)
        if (state.trace && stepIndex >= 0) {
          const executionSteps = state.trace.steps.filter(step => step.type !== 'traversal');

          if (stepIndex < executionSteps.length) {
            const steps = executionSteps.slice(0, stepIndex + 1);
            const nodeIds = new Set();

            for (const step of steps) {
              if (step.nodeId && step.status === 'executed') {
                nodeIds.add(step.nodeId);
              }
            }

            state.highlightedNodeIds = nodeIds;

            // Устанавливаем текущую активную ноду (последняя выполненная на текущем шаге)
            const currentStep = executionSteps[stepIndex];
            state.currentActiveNodeId = currentStep?.nodeId || null;
          } else {
            state.highlightedNodeIds = new Set();
            state.currentActiveNodeId = null;
          }
        } else {
          state.highlightedNodeIds = new Set();
          state.currentActiveNodeId = null;
        }
      });
    },

    setTraceSpeed: (speed) => {
      set(state => {
        state.playbackState.speed = speed;
      });
    },

    highlightNode: (nodeId) => {
      set(state => {
        state.highlightedNodeIds.add(nodeId);
      });
    },

    clearHighlights: () => {
      set({ highlightedNodeIds: new Set() });
    },

    // Debug system methods
    addBreakpoint: (nodeId, condition = null) => {
      const { socket, command } = get();
      if (!socket) return;

      socket.emit('debug:set-breakpoint', {
        graphId: command.id,
        nodeId,
        condition
      });
    },

    removeBreakpoint: (nodeId) => {
      const { socket, command } = get();
      if (!socket) return;

      socket.emit('debug:remove-breakpoint', {
        graphId: command.id,
        nodeId
      });
    },

    toggleBreakpoint: (nodeId) => {
      const { socket, command, breakpoints } = get();
      if (!socket) return;

      const bp = breakpoints.get(nodeId);
      if (bp) {
        socket.emit('debug:toggle-breakpoint', {
          graphId: command.id,
          nodeId,
          enabled: !bp.enabled
        });
      }
    },

    continueExecution: (overrides = null) => {
      const { socket, debugSession } = get();
      if (!socket || !debugSession) {
        console.warn('[Debug] Cannot continue - no socket or debug session');
        return;
      }

      console.log('[Debug] Sending debug:continue with sessionId:', debugSession.sessionId, 'overrides:', overrides);
      socket.emit('debug:continue', {
        sessionId: debugSession.sessionId,
        overrides,
        stepMode: false
      });
    },

    stepExecution: (overrides = null) => {
      const { socket, debugSession } = get();
      if (!socket || !debugSession) {
        console.warn('[Debug] Cannot step - no socket or debug session');
        return;
      }

      console.log('[Debug] Sending debug:continue with stepMode=true, sessionId:', debugSession.sessionId);
      socket.emit('debug:continue', {
        sessionId: debugSession.sessionId,
        overrides,
        stepMode: true
      });
    },

    stopExecution: () => {
      const { socket, debugSession } = get();
      if (!socket || !debugSession) return;

      socket.emit('debug:stop', {
        sessionId: debugSession.sessionId
      });
    },

    setDebugMode: (mode) => {
      const { socket, command } = get();

      // Уведомляем других пользователей о смене режима
      if (socket && command) {
        socket.emit('collab:mode-change', {
          botId: command.botId,
          graphId: command.id,
          debugMode: mode
        });
      }

      // Если переключаемся в live режим и есть socket - присоединяемся к debug
      if (mode === 'live' && socket && command) {
        console.log('[Debug] Joining debug session...');
        socket.emit('debug:join', {
          botId: command.botId,
          graphId: command.id
        });
      }

      // Если переключаемся из live режима (в trace или normal) - покидаем debug
      if ((mode === 'trace' || mode === 'normal') && get().debugMode === 'live' && socket && command) {
        console.log('[Debug] Leaving debug session...');
        socket.emit('debug:leave', {
          botId: command.botId,
          graphId: command.id
        });

        // Очищаем debug state
        set({
          breakpoints: new Map(),
          debugSession: null,
          connectedDebugUsers: [],
        });
      }

      // Закрываем TraceViewer при переключении в live режим
      if (mode === 'live') {
        set({ isTraceViewerOpen: false });
      }

      // Обновляем режим
      set({ debugMode: mode });
    },

    // Подключение к графу для collaborative editing (всегда активно)
    connectGraphSocket: (onConnectedCallback) => {
      const { socket, command } = get();
      if (socket || !command) return; // Уже подключен или нет команды

      const token = useAppStore.getState().token;
      if (!token) {
        console.warn('[Collab] Cannot connect - no auth token');
        return;
      }

      console.log('[Collab] Creating WebSocket connection for collaborative editing...');

      const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
      const newSocket = io(SOCKET_URL, {
        path: "/socket.io/",
        auth: { token },
        query: {
          initialPath: window.location.pathname  // Передаем текущий путь для presence
        },
        transports: ['websocket', 'polling'],
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      set({ socket: newSocket });

      newSocket.on('connect', () => {
        console.log('[Collab] WebSocket connected, joining graph...');

        // Обновляем presence с актуальным путем при (пере)подключении
        // metadata будут обновлены из VisualEditorPage.jsx
        newSocket.emit('presence:update', {
          path: window.location.pathname
        });

        // Присоединяемся к графу для collaborative editing с текущим режимом
        const { debugMode } = get();
        newSocket.emit('collab:join', {
          botId: command.botId,
          graphId: command.id,
          debugMode: debugMode || 'normal'
        });

        // Если в live debug режиме, также присоединяемся к debug
        if (debugMode === 'live') {
          newSocket.emit('debug:join', {
            botId: command.botId,
            graphId: command.id
          });
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('[Collab] WebSocket disconnected, reason:', reason);
      });

      newSocket.on('connect_error', (error) => {
        console.error('[Collab] WebSocket connection error:', error);
      });

      // ========== COLLABORATIVE EDITING EVENTS ==========

      // Состояние комнаты при подключении
      newSocket.on('collab:state', ({ users, graphState }) => {
        console.log('[Collab] Received room state:', users, graphState);
        set({ collabUsers: users });

        // Если есть состояние графа от других пользователей - применяем его
        if (graphState && graphState.nodes && graphState.edges && graphState.nodes.length > 0) {
          console.log('[Collab] Applying synced graph state from other users:', graphState.nodes.length, 'nodes,', graphState.edges.length, 'edges');
          set({
            nodes: graphState.nodes,
            edges: graphState.edges,
          });
        } else {
          // Мы первые в комнате или graphState пустой - вызываем callback для инициализации
          console.log('[Collab] No graph state from server, will initialize from loaded data');
          if (onConnectedCallback) {
            onConnectedCallback();
          }
        }
      });

      // Новый пользователь присоединился
      newSocket.on('collab:user-joined', ({ user }) => {
        console.log('[Collab] User joined:', user);
        set(state => {
          if (!state.collabUsers.find(u => u.socketId === user.socketId)) {
            state.collabUsers.push(user);
          }
        });
        toast({
          title: '👋 Пользователь присоединился',
          description: `${user.username} начал редактировать граф`
        });
      });

      // Пользователь покинул
      newSocket.on('collab:user-left', ({ socketId, username }) => {
        console.log('[Collab] User left:', socketId);
        set(state => {
          state.collabUsers = state.collabUsers.filter(u => u.socketId !== socketId);
          state.collabCursors.delete(socketId);
          state.collabSelections.delete(socketId);
        });
        toast({
          title: '👋 Пользователь отключился',
          description: `${username} покинул редактор`
        });
      });

      // Движение курсора
      newSocket.on('collab:cursor-move', ({ socketId, username, color, x, y }) => {
        set(state => {
          state.collabCursors.set(socketId, { x, y, username, color });
        });
      });

      // Изменение выбора нод
      newSocket.on('collab:selection-changed', ({ socketId, username, color, nodeIds }) => {
        set(state => {
          state.collabSelections.set(socketId, { nodeIds, username, color });
        });
      });

      // Изменение режима отладки
      newSocket.on('collab:mode-changed', ({ socketId, username, debugMode }) => {
        console.log(`[Collab] User ${username} switched to ${debugMode} mode`);
        set(state => {
          const user = state.collabUsers.find(u => u.socketId === socketId);
          if (user) {
            user.debugMode = debugMode;
          }
        });

        // Показываем уведомление
        const modeLabels = {
          'live': '🐛 Live Debug',
          'trace': '📊 Просмотр трассировки',
          'normal': '✏️ Обычный режим'
        };
        toast({
          title: `${username} переключился`,
          description: modeLabels[debugMode] || debugMode
        });
      });

      // Изменения нод
      newSocket.on('collab:node-changed', ({ type, data, username }) => {
        console.log('[Collab] Node changed:', type, data, 'by', username);

        switch (type) {
          case 'move': {
            // data = [{ id, position }]
            set(state => {
              data.forEach(change => {
                const node = state.nodes.find(n => n.id === change.id);
                if (node) {
                  node.position = change.position;
                }
              });
            });
            break;
          }
          case 'create': {
            // data = { node }
            set(state => {
              if (!state.nodes.find(n => n.id === data.node.id)) {
                state.nodes.push(data.node);
              }
            });
            break;
          }
          case 'delete': {
            // data = { nodeIds: [] }
            set(state => {
              state.nodes = state.nodes.filter(n => !data.nodeIds.includes(n.id));
            });
            break;
          }
          case 'update': {
            // data = { nodeId, nodeData }
            set(state => {
              const node = state.nodes.find(n => n.id === data.nodeId);
              if (node) {
                node.data = { ...node.data, ...data.nodeData };
              }
            });
            break;
          }
        }
      });

      // Изменения связей
      newSocket.on('collab:edge-changed', ({ type, data, username }) => {
        console.log('[Collab] Edge changed:', type, data, 'by', username);

        switch (type) {
          case 'create': {
            // data = { edge }
            set(state => {
              if (!state.edges.find(e => e.id === data.edge.id)) {
                state.edges.push(data.edge);
              }
            });
            break;
          }
          case 'delete': {
            // data = { edgeIds: [] }
            set(state => {
              state.edges = state.edges.filter(e => !data.edgeIds.includes(e.id));
            });
            break;
          }
        }
      });

      // Hot reload графа
      newSocket.on('collab:graph-reloaded', ({ botId, graphId }) => {
        console.log('[Collab] Graph reloaded for bot', botId, 'graphId:', graphId);
        toast({
          title: '🔄 Граф перезагружен',
          description: 'Изменения применены без перезапуска бота'
        });
      });

      // Начало создания соединения
      newSocket.on('collab:connection-start', ({ socketId, username, color, fromX, fromY, fromNodeId, fromHandleId }) => {
        console.log('[Collab] Connection started by', username);
        set(state => {
          state.collabConnections.set(socketId, {
            fromX,
            fromY,
            toX: fromX,
            toY: fromY,
            username,
            color,
            fromNodeId,
            fromHandleId
          });
        });
      });

      // Обновление позиции соединения
      newSocket.on('collab:connection-update', ({ socketId, toX, toY }) => {
        set(state => {
          const connection = state.collabConnections.get(socketId);
          if (connection) {
            connection.toX = toX;
            connection.toY = toY;
          }
        });
      });

      // Завершение создания соединения
      newSocket.on('collab:connection-end', ({ socketId }) => {
        set(state => {
          state.collabConnections.delete(socketId);
        });
      });

      // ========== DEBUG EVENTS (только в live mode) ==========

      newSocket.on('debug:state', (data) => {
        set(state => {
          state.breakpoints = new Map(
            data.breakpoints.map(bp => [bp.nodeId, bp])
          );
          state.debugSession = data.activeExecution;
          state.connectedDebugUsers = data.connectedUsers || [];
        });
      });

      newSocket.on('debug:breakpoint-added', ({ breakpoint }) => {
        set(state => {
          state.breakpoints.set(breakpoint.nodeId, breakpoint);
        });
      });

      newSocket.on('debug:breakpoint-removed', ({ nodeId }) => {
        set(state => {
          state.breakpoints.delete(nodeId);
        });
      });

      newSocket.on('debug:breakpoint-toggled', ({ nodeId, enabled }) => {
        set(state => {
          const bp = state.breakpoints.get(nodeId);
          if (bp) {
            bp.enabled = enabled;
          }
        });
      });

      newSocket.on('debug:paused', (data) => {
        const currentState = get();
        console.log('[Debug] Received debug:paused event:', data);
        console.log('[Debug] Current debugMode:', currentState.debugMode);
        console.log('[Debug] Current isTraceViewerOpen:', currentState.isTraceViewerOpen);

        // Always set debugSession when paused, regardless of mode
        set(state => {
          console.log('[Debug] Setting debugSession in state');
          state.debugSession = {
            sessionId: data.sessionId,
            nodeId: data.nodeId,
            nodeType: data.nodeType,
            inputs: data.inputs,
            executedSteps: data.executedSteps,
            status: 'paused'  // IMPORTANT: Add status field
          };
          console.log('[Debug] debugSession set:', state.debugSession);
        });
      });

      newSocket.on('debug:resumed', () => {
        console.log('[Debug] Received debug:resumed event');
        set(state => {
          state.debugSession = null;
        });
      });

      newSocket.on('debug:completed', ({ trace }) => {
        console.log('[Debug] Received debug:completed event, trace:', trace);
        set(state => {
          state.debugSession = null;
          state.trace = trace;
        });
      });

      newSocket.on('debug:user-joined', ({ userCount, users }) => {
        set({ connectedDebugUsers: users || [] });
      });

      newSocket.on('debug:user-left', ({ userCount, users }) => {
        set({ connectedDebugUsers: users || [] });
      });

      newSocket.on('debug:value-updated', ({ key, value, updatedBy }) => {
        console.log('[Debug] Value updated by', updatedBy, ':', key, '=', value);
        set(state => {
          if (!state.debugSession?.executedSteps) return;

          const parts = key.split('.');
          if (parts.length !== 3) return;

          const [nodeId, direction, pinId] = parts;
          const step = state.debugSession.executedSteps.steps?.find(s => s.nodeId === nodeId);

          if (step) {
            if (direction === 'out' && step.outputs) {
              step.outputs[pinId] = value;
            } else if (direction === 'in' && step.inputs) {
              step.inputs[pinId] = value;
            }
          }
        });
      });
    },

    setViewport: (viewport) => {
      set({ viewport });
    },

    disconnectGraphSocket: () => {
      const { socket, command } = get();
      if (!socket || !command) return;

      console.log('[Collab] Disconnecting from graph...');

      // Покидаем комнату
      socket.emit('collab:leave', {
        botId: command.botId,
        graphId: command.id
      });

      // Отключаем все обработчики
      socket.off('collab:state');
      socket.off('collab:user-joined');
      socket.off('collab:user-left');
      socket.off('collab:cursor-move');
      socket.off('collab:selection-changed');
      socket.off('collab:mode-changed');
      socket.off('collab:node-changed');
      socket.off('collab:edge-changed');
      socket.off('collab:graph-reloaded');
      socket.off('collab:connection-start');
      socket.off('collab:connection-update');
      socket.off('collab:connection-end');
      socket.off('debug:state');
      socket.off('debug:breakpoint-added');
      socket.off('debug:breakpoint-removed');
      socket.off('debug:breakpoint-toggled');
      socket.off('debug:paused');
      socket.off('debug:resumed');
      socket.off('debug:completed');
      socket.off('debug:user-joined');
      socket.off('debug:user-left');
      socket.off('debug:value-updated');

      socket.disconnect();

      set({
        socket: null,
        collabUsers: [],
        collabCursors: new Map(),
        collabSelections: new Map(),
        collabConnections: new Map(),
        breakpoints: new Map(),
        debugSession: null,
        connectedDebugUsers: [],
      });
    },
  };
  })
);
