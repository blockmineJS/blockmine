import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import 'reactflow/dist/style.css';
import {
    ReactFlow,
    ReactFlowProvider,
    Controls,
    ControlButton,
    Background,
    useReactFlow,
    useStore,
    useStoreApi,
} from 'reactflow';
import { shallow } from 'zustand/shallow';

import { useVisualEditorStore } from '@/stores/visualEditorStore';
import { useAppStore } from '@/stores/appStore';
import NodePanel from '@/components/visual-editor/NodePanel';
import SettingsPanel from '@/components/visual-editor/SettingsPanel';
import CustomNode from '@/components/visual-editor/CustomNode.new';
import AnimatedEdge from '@/components/visual-editor/AnimatedEdge';
import TraceViewer from '@/components/visual-editor/TraceViewer';
import TraceStepInfo from '@/components/visual-editor/TraceStepInfo';
import DebugPanel from '@/components/visual-editor/DebugPanel';
import DebugControls from '@/components/visual-editor/DebugControls';
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import CommandMenu from "@/components/ui/CommandMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Share2, Zap, Bug, Plus, Minus, ScanSearch, Lock, LockOpen } from 'lucide-react';
import { toast } from 'sonner';
import { initializeVisualEditor } from '@/components/visual-editor/initVisualEditor';
import NodeRegistry from '@/components/visual-editor/nodes';
import { apiHelper, getGraphStoreApiUrl } from '@/lib/api';
import CollaborativeUsersHeader from '@/components/visual-editor/CollaborativeUsersHeader';
import CollaborativeCursors from '@/components/visual-editor/CollaborativeCursors';
import CollaborativeConnections from '@/components/visual-editor/CollaborativeConnections';
import { useNodeTranslation } from '@/components/visual-editor/hooks/useNodeTranslation';
import { normalizeVisualEditorCategory } from '@/components/visual-editor/categoryUtils';
import FadeTransition from '@/components/FadeTransition';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';

initializeVisualEditor();

const nodeTypes = (() => {
    const types = {};

    const allDefinitions = NodeRegistry.getAll();
    allDefinitions.forEach(definition => {
        types[definition.type] = CustomNode;
    });

    if (import.meta.env.MODE !== 'production') {
        console.log(`[ReactFlow] Registered ${allDefinitions.length} node types:`, Object.keys(types));
    }

    types.default = CustomNode;

    return Object.freeze(types);
})();

// Создаём типы для edges с анимацией
const edgeTypes = {
    default: AnimatedEdge,
};

const flowControlsSelector = (state) => ({
    isInteractive: state.nodesDraggable || state.nodesConnectable || state.elementsSelectable,
    minZoomReached: state.transform[2] <= state.minZoom,
    maxZoomReached: state.transform[2] >= state.maxZoom,
});

function VisualEditorControls() {
    const { t } = useTranslation('visual-editor');
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const reactFlowStore = useStoreApi();
    const { isInteractive, minZoomReached, maxZoomReached } = useStore(flowControlsSelector, shallow);

    const handleToggleInteractivity = () => {
        const nextInteractive = !isInteractive;
        reactFlowStore.setState({
            nodesDraggable: nextInteractive,
            nodesConnectable: nextInteractive,
            elementsSelectable: nextInteractive,
        });
    };

    return (
        <Controls className="visual-editor-flow-controls" showZoom={false} showFitView={false} showInteractive={false}>
            <ControlButton
                className="visual-editor-flow-control-button"
                onClick={() => zoomIn({ duration: 220 })}
                title={t('controls.zoomIn', { defaultValue: 'Приблизить' })}
                aria-label={t('controls.zoomIn', { defaultValue: 'Приблизить' })}
                disabled={maxZoomReached}
            >
                <Plus className="h-[15px] w-[15px]" strokeWidth={2.3} absoluteStrokeWidth />
            </ControlButton>
            <ControlButton
                className="visual-editor-flow-control-button"
                onClick={() => zoomOut({ duration: 220 })}
                title={t('controls.zoomOut', { defaultValue: 'Отдалить' })}
                aria-label={t('controls.zoomOut', { defaultValue: 'Отдалить' })}
                disabled={minZoomReached}
            >
                <Minus className="h-[15px] w-[15px]" strokeWidth={2.3} absoluteStrokeWidth />
            </ControlButton>
            <ControlButton
                className="visual-editor-flow-control-button"
                onClick={() => fitView({ duration: 260, padding: 0.16 })}
                title={t('controls.fitView', { defaultValue: 'Показать весь граф' })}
                aria-label={t('controls.fitView', { defaultValue: 'Показать весь граф' })}
            >
                <ScanSearch className="h-[15px] w-[15px]" strokeWidth={2.2} absoluteStrokeWidth />
            </ControlButton>
            <ControlButton
                className={cn(
                    "visual-editor-flow-control-button visual-editor-flow-control-lock",
                    !isInteractive && "is-locked"
                )}
                onClick={handleToggleInteractivity}
                title={isInteractive
                    ? t('controls.lockInteractions', { defaultValue: 'Заблокировать перемещение и выделение' })
                    : t('controls.unlockInteractions', { defaultValue: 'Разблокировать перемещение и выделение' })}
                aria-label={isInteractive
                    ? t('controls.lockInteractions', { defaultValue: 'Заблокировать перемещение и выделение' })
                    : t('controls.unlockInteractions', { defaultValue: 'Разблокировать перемещение и выделение' })}
            >
                <span className="visual-editor-flow-control-icon-stack" aria-hidden="true">
                    <LockOpen className="visual-editor-flow-control-icon visual-editor-flow-control-icon-open h-[15px] w-[15px]" strokeWidth={2.2} absoluteStrokeWidth />
                    <Lock className="visual-editor-flow-control-icon visual-editor-flow-control-icon-closed h-[15px] w-[15px]" strokeWidth={2.2} absoluteStrokeWidth />
                </span>
            </ControlButton>
        </Controls>
    );
}

function BotVisualEditorPage() {
    const { botId, commandId, eventId } = useParams();
    const location = useLocation();
    const { t } = useTranslation('visual-editor');
    const { getNodeTranslation } = useNodeTranslation();

    const [botName, setBotName] = useState(null);
    const appSocket = useAppStore(state => state.socket);
    const bots = useAppStore(state => state.bots);
    const init = useVisualEditorStore(state => state.init);
    const isLoading = useVisualEditorStore(state => state.isLoading);
    const isSaving = useVisualEditorStore(state => state.isSaving);
    const command = useVisualEditorStore(state => state.command);
    const availableNodes = useVisualEditorStore(state => state.availableNodes);
    const saveGraph = useVisualEditorStore(state => state.saveGraph);
    const flushSaveGraph = useVisualEditorStore(state => state.flushSaveGraph);
    const nodes = useVisualEditorStore(state => state.nodes);
    const edges = useVisualEditorStore(state => state.edges);
    const onNodesChange = useVisualEditorStore(state => state.onNodesChange);
    const onEdgesChange = useVisualEditorStore(state => state.onEdgesChange);
    const onConnect = useVisualEditorStore(state => state.onConnect);
    const addNode = useVisualEditorStore(state => state.addNode);
    const openMenu = useVisualEditorStore(state => state.openMenu);
    const closeMenu = useVisualEditorStore(state => state.closeMenu);
    const isMenuOpen = useVisualEditorStore(state => state.isMenuOpen);
    const menuPosition = useVisualEditorStore(state => state.menuPosition);
    const setConnectingPin = useVisualEditorStore(state => state.setConnectingPin);
    const onConnectStart = useVisualEditorStore(state => state.onConnectStart);
    const connectingPin = useVisualEditorStore(state => state.connectingPin);
    const isTraceViewerOpen = useVisualEditorStore(state => state.isTraceViewerOpen);
    const closeTraceViewer = useVisualEditorStore(state => state.closeTraceViewer);
    const debugMode = useVisualEditorStore(state => state.debugMode);
    const setDebugMode = useVisualEditorStore(state => state.setDebugMode);
    const socket = useVisualEditorStore(state => state.socket);
    const setViewport = useVisualEditorStore(state => state.setViewport);
    const copyNodes = useVisualEditorStore(state => state.copyNodes);
    const pasteNodes = useVisualEditorStore(state => state.pasteNodes);

    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [isRouteReady, setIsRouteReady] = useState(false);
    const reactFlowWrapper = useRef(null);
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [showEventTypeDialog, setShowEventTypeDialog] = useState(false);
    const [availableEventTypes, setAvailableEventTypes] = useState([]);
    const [hoveredNodeId, setHoveredNodeId] = useState(null);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [publishForm, setPublishForm] = useState({
        name: '',
        author: '',
        description: ''
    });
    const [categories, setCategories] = useState([]);

    const editorType = location.pathname.includes('/commands/') ? 'command' : 'event';
    const entityId = editorType === 'command' ? commandId : eventId;

    useEffect(() => {
        let isMounted = true;

        setIsRouteReady(false);

        if (botId && entityId) {
            init(botId, entityId, editorType).finally(() => {
                if (isMounted) {
                    setIsRouteReady(true);
                }
            });
        }

        return () => {
            isMounted = false;
            setIsRouteReady(false);
            flushSaveGraph();
            // Отключаемся от collaborative socket при уходе со страницы
            const disconnectGraphSocket = useVisualEditorStore.getState().disconnectGraphSocket;
            disconnectGraphSocket();
        };
    }, [botId, entityId, editorType, init, flushSaveGraph]);

    // Загружаем информацию о боте из store
    useEffect(() => {
        if (!botId || !bots) return;

        const bot = bots.find(b => b.id === parseInt(botId));
        if (bot) {
            setBotName(bot.username || bot.name || t('editor.botFallback', { id: botId }));
        } else {
            setBotName(t('editor.botFallback', { id: botId }));
        }
    }, [botId, bots, t]);

    // Отправляем метаданные для presence (название графа и бота)
    useEffect(() => {
        if (!appSocket || !command || !botName) return;

        appSocket.emit('presence:update', {
            path: location.pathname,
            metadata: {
                graphName: command.name,
                botName: botName
            }
        });
    }, [appSocket, command, botName, location.pathname]);

    // Global mouse tracking для collaborative cursors и позиции курсора
    useEffect(() => {
        if (!reactFlowInstance) return;

        const handleMouseMove = (event) => {
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            // Сохраняем позицию курсора для Ctrl+V
            setCursorPosition(position);

            // Collaborative cursor
            if (socket && command) {
                socket.emit('collab:cursor', {
                    botId: command.botId,
                    graphId: command.id,
                    x: position.x,
                    y: position.y,
                });

                // Если сейчас создаем соединение, отправляем обновление
                if (connectingPin) {
                    socket.emit('collab:connection-update', {
                        botId: command.botId,
                        graphId: command.id,
                        toX: position.x,
                        toY: position.y,
                    });
                }
            }
        };

        // Throttled version
        let timeout = null;
        const throttledHandleMouseMove = (event) => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => handleMouseMove(event), 10); // ~100fps
        };

        document.addEventListener('mousemove', throttledHandleMouseMove);

        return () => {
            document.removeEventListener('mousemove', throttledHandleMouseMove);
            if (timeout) clearTimeout(timeout);
        };
    }, [socket, command, reactFlowInstance, connectingPin]);

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // Получаем актуальное состояние из store, а не из closure
            const currentNodes = useVisualEditorStore.getState().nodes;
            const currentEdges = useVisualEditorStore.getState().edges;

            if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'с')) {
                event.preventDefault();

                // Если нет выделенных нод, но есть нода под курсором - выделяем её и копируем
                const selectedNodes = currentNodes.filter(n => n.selected);
                if (selectedNodes.length === 0 && hoveredNodeId) {
                    console.log('[Copy] No selected nodes, copying hovered node:', hoveredNodeId);
                    // Временно выделяем ноду под курсором
                    useVisualEditorStore.setState(state => {
                        const nodeIndex = state.nodes.findIndex(n => n.id === hoveredNodeId);
                        if (nodeIndex !== -1) {
                            state.nodes[nodeIndex].selected = true;
                        }
                    });
                    copyNodes();
                    // Снимаем выделение после копирования
                    useVisualEditorStore.setState(state => {
                        const nodeIndex = state.nodes.findIndex(n => n.id === hoveredNodeId);
                        if (nodeIndex !== -1) {
                            state.nodes[nodeIndex].selected = false;
                        }
                    });
                } else {
                    copyNodes();
                }
            }

            if ((event.ctrlKey || event.metaKey) && (event.key === 'v' || event.key === 'м')) {
                console.log('[Paste] Triggered!');
                event.preventDefault();
                pasteNodes(cursorPosition);
            }

            // Delete или Backspace - удаляем выбранные элементы
            if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();

                const selectedNodes = currentNodes.filter(n => n.selected);
                const selectedEdges = currentEdges.filter(e => e.selected);

                // Удаляем выбранные ноды
                if (selectedNodes.length > 0) {
                    onNodesChange(selectedNodes.map(n => ({ type: 'remove', id: n.id })));
                }
                // Если нет выбранных нод, но есть hovered нода - удаляем её
                else if (hoveredNodeId) {
                    onNodesChange([{ type: 'remove', id: hoveredNodeId }]);
                }

                // Удаляем выбранные edges (связи)
                if (selectedEdges.length > 0) {
                    onEdgesChange(selectedEdges.map(e => ({ type: 'remove', id: e.id })));
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [copyNodes, pasteNodes, hoveredNodeId, nodes, cursorPosition, onNodesChange]);

    const loadCategories = async () => {
        try {
            const response = await fetch(getGraphStoreApiUrl('/api/graphs/categories'));
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    };

    const handleToggleTraceViewer = async (selectedEventType = null) => {
        // Если трассировка уже открыта - закрываем
        if (isTraceViewerOpen) {
            closeTraceViewer();
            return;
        }

        // Открываем трассировку
        try {
            const graphId = entityId === 'new' ? null : parseInt(entityId);
            if (!graphId) {
                toast.error(t('save.saveFirst'));
                return;
            }

            // Если eventType не указан, проверяем сколько event нод в графе
            if (!selectedEventType) {
                const eventNodes = nodes.filter(n => n.type?.startsWith('event:'));

                if (eventNodes.length === 0) {
                    toast.error(t('trace.noEventNodes'));
                    return;
                }

                // Если больше одной event ноды, открываем диалог выбора
                if (eventNodes.length > 1) {
                    const types = eventNodes.map(n => ({
                        type: n.type.replace('event:', ''),
                        label: getNodeTranslation(n.type).label || NodeRegistry.get(n.type)?.label || n.type
                    }));
                    setAvailableEventTypes(types);
                    setShowEventTypeDialog(true);
                    return;
                } else {
                    // Если только одна event нода, используем её
                    selectedEventType = eventNodes[0].type.replace('event:', '');
                }
            }

            const url = selectedEventType
                ? `/api/traces/${botId}/graph/${graphId}/last?eventType=${selectedEventType}`
                : `/api/traces/${botId}/graph/${graphId}/last`;


            const response = await apiHelper(url);
            console.log('[VisualEditorPage] Trace API response:', {
                success: response.success,
                hasTrace: !!response.trace,
                traceStepsCount: response.trace?.steps?.length,
                traceData: response.trace
            });

            if (response.success && response.trace) {
                if (debugMode === 'live') {
                    setDebugMode('normal');
                }
                useVisualEditorStore.getState().openTraceViewer(response.trace);
            } else {
                toast.error(t('trace.notFound'));
            }
        } catch (error) {
            console.error('Ошибка загрузки трассировки:', error);
            toast.error(t('trace.loadError'));
        }
    };

    const handleToggleDebugMode = () => {
        const newMode = debugMode === 'live' ? 'normal' : 'live';

        if (newMode === 'live' && isTraceViewerOpen) {
            closeTraceViewer();
        }

        setDebugMode(newMode);
    };

    const handlePublish = async () => {
        try {
            if (!publishForm.name || !publishForm.author || !publishForm.description) {
                toast.error(t('publish.allFieldsRequired'));
                return;
            }

            if (publishForm.description.length < 10) {
                toast.error(t('publish.descriptionMinLength'));
                return;
            }

            const graphData = {
                nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
                connections: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
                    id,
                    sourceNodeId: source,
                    targetNodeId: target,
                    sourcePinId: sourceHandle,
                    targetPinId: targetHandle,
                })),
                variables: command.variables || []
            };

            const graphType = editorType === 'command' ? 'COMMAND' : 'EVENT';
            const categoryId = graphType === 'COMMAND' ? 1 : 2;

            const response = await fetch(getGraphStoreApiUrl('/api/graphs/publish'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...publishForm,
                    graphData,
                    graphType,
                    categoryId
                })
            });

            if (response.ok) {
                toast.success(t('publish.success'));
                setPublishDialogOpen(false);
                setPublishForm({
                    name: '',
                    author: '',
                    description: ''
                });
            } else {
                const error = await response.json();
                toast.error(error.error || t('publish.error'));
            }
        } catch (error) {
            console.error('Ошибка:', error);
            toast.error(t('publish.error'));
        }
    };
    
    // REMOVED: generatedNodeTypes - все ноды используют один компонент CustomNode
    // который сам получает definition из NodeRegistry, поэтому достаточно
    // статического объекта nodeTypes = { custom: CustomNode }
    
    const variables = useVisualEditorStore(state => state.variables);
    const commandArguments = useVisualEditorStore(state => state.commandArguments);

    const menuItems = useMemo(() => {
        if (!availableNodes) return [];

        const dynamicGroups = [];

        // Добавляем группу переменных
        if (variables && variables.length > 0) {
            const variableItems = [];
            variables.forEach(variable => {
                variableItems.push({
                    label: `📤 ${t('variables.get')} ${variable.name}`,
                    type: 'data:get_variable',
                    data: { variableName: variable.name }
                });
                variableItems.push({
                    label: `📥 ${t('variables.set')} ${variable.name}`,
                    type: 'action:bot_set_variable',
                    data: { variableName: variable.name }
                });
            });
            dynamicGroups.push({
                label: `📦 ${t('variables.group')}`,
                children: variableItems
            });
        }

        // Добавляем группу аргументов
        if (commandArguments && commandArguments.length > 0) {
            const argumentItems = commandArguments.map(arg => ({
                label: `📤 ${t('arguments.get')} ${arg.name}`,
                type: 'data:get_argument',
                data: { argumentName: arg.name }
            }));
            dynamicGroups.push({
                label: `🎯 ${t('arguments.group')}`,
                children: argumentItems
            });
        }

        const staticGroups = Object.entries(availableNodes).map(([category, nodes]) => ({
            label: t(`nodePanel.categories.${normalizeVisualEditorCategory(category)}`, { defaultValue: category }),
            children: nodes.map(node => ({
                label: getNodeTranslation(node.type).label || node.label,
                type: node.type,
            }))
        }));

        return [...dynamicGroups, ...staticGroups];
    }, [availableNodes, variables, commandArguments, getNodeTranslation, t]);

    const handleMenuItemSelect = (item) => {
        const { menuPosition, addNode, closeMenu, socket, command } = useVisualEditorStore.getState();
        const newNode = addNode(item.type, menuPosition.flowPosition, false);
        if (!newNode) {
            closeMenu();
            return;
        }

        // Если есть дополнительные данные (для переменных/аргументов), применяем их
        if (item.data && Object.keys(item.data).length > 0) {
            newNode.data = { ...newNode.data, ...item.data };
        }

        // Добавляем ноду в state
        useVisualEditorStore.setState(state => {
            state.nodes.push(newNode);
        });

        if (socket && command) {
            socket.emit('collab:nodes', {
                botId: command.botId,
                graphId: command.id,
                type: 'create',
                data: { node: newNode }
            });
        }

        closeMenu();
    };

    const handleSave = () => {
        saveGraph(botId);
    };
    
    const handlePaneInteraction = (event, handler) => {
        if (!reactFlowInstance || !reactFlowWrapper.current) return;

        const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        const rect = reactFlowWrapper.current.getBoundingClientRect();
        handler(event.clientY - rect.top, event.clientX - rect.left, position);
    };

    const handleConnectStart = (event, { nodeId, handleId, handleType }) => {
        // Вызываем оригинальный onConnectStart из store
        onConnectStart(event, { handleType, nodeId, handleId });

        // Broadcast начало создания соединения
        if (socket && command && reactFlowInstance) {
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX || 0,
                y: event.clientY || 0,
            });

            socket.emit('collab:connection-start', {
                botId: command.botId,
                graphId: command.id,
                fromX: position.x,
                fromY: position.y,
                fromNodeId: nodeId,
                fromHandleId: handleId,
            });
        }
    };

    const handleConnectEnd = (event) => {
        if (!connectingPin) return;
        const targetIsPane = event.target.classList.contains('react-flow__pane');
        if (targetIsPane) {
            handlePaneInteraction(event, openMenu);
        }
        setConnectingPin(null);

        // Broadcast завершение создания соединения
        if (socket && command) {
            socket.emit('collab:connection-end', {
                botId: command.botId,
                graphId: command.id,
            });
        }
    };

    const onDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (event) => {
        event.preventDefault();
        if (!reactFlowInstance) return;
        const type = event.dataTransfer.getData('application/reactflow');
        const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });
        addNode(type, position);
    };

    return (
        <FadeTransition
            transitionKey={`${editorType}-${entityId}`}
            ready={isRouteReady && !isLoading && Object.keys(availableNodes).length > 0}
            duration={0.22}
            className="h-full"
            fallback={
                <div className="flex h-full items-center justify-center text-muted-foreground">
                    {t('loading')}
                </div>
            }
        >
            <ReactFlowProvider>
                <div
                    className="h-full w-full flex flex-col"
                    onContextMenu={(e) => e.preventDefault()}
                >
                 <header className="p-2 border-b flex justify-between items-center">
                    <h1 className="text-lg font-bold">{t('editor.title')}: {command?.name}</h1>
                    <div className="flex gap-2 items-center">
                        <CollaborativeUsersHeader />
                        <Button
                            variant={debugMode === 'live' ? 'default' : 'outline'}
                            size="sm"
                            onClick={handleToggleDebugMode}
                        >
                            <Bug className="w-4 h-4 mr-2" />
                            {debugMode === 'live' ? t('debug.liveEnabled') : t('debug.live')}
                        </Button>
                        <Button
                            variant={isTraceViewerOpen ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleToggleTraceViewer()}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            {isTraceViewerOpen ? t('debug.traceEnabled') : t('debug.traceView')}
                        </Button>
                        <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    {t('publish.button')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{t('publish.title')}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">{t('publish.name')}</Label>
                                        <Input
                                            id="name"
                                            value={publishForm.name}
                                            onChange={(e) => setPublishForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder={t('publish.namePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="author">{t('publish.author')}</Label>
                                        <Input
                                            id="author"
                                            value={publishForm.author}
                                            onChange={(e) => setPublishForm(prev => ({ ...prev, author: e.target.value }))}
                                            placeholder={t('publish.authorPlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="description">{t('publish.description')}</Label>
                                        <Textarea
                                            id="description"
                                            value={publishForm.description}
                                            onChange={(e) => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder={t('publish.descriptionPlaceholder')}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={handlePublish} className="flex-1">
                                            {t('publish.submit')}
                                        </Button>
                                        <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                                            {t('publish.cancel')}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={showEventTypeDialog} onOpenChange={setShowEventTypeDialog}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>{t('selectEventType.title')}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3">
                                    {availableEventTypes.map((eventType) => (
                                        <Button
                                            key={eventType.type}
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setShowEventTypeDialog(false);
                                                handleToggleTraceViewer(eventType.type);
                                            }}
                                        >
                                            {eventType.label}
                                        </Button>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? t('save.saving') : t('save.button')}
                        </Button>
                    </div>
                </header>
                <ResizablePanelGroup direction="horizontal" className="flex-grow">
                    {!isTraceViewerOpen && debugMode !== 'live' && (
                        <>
                            <ResizablePanel defaultSize={15}>
                                <NodePanel />
                            </ResizablePanel>
                            <ResizableHandle withHandle />
                        </>
                    )}
                    <ResizablePanel defaultSize={isTraceViewerOpen ? 80 : 65}>
                        <div className="relative h-full overflow-hidden" ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onConnectStart={handleConnectStart}
                                onConnectEnd={handleConnectEnd}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                onInit={setReactFlowInstance}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onNodeMouseEnter={(event, node) => setHoveredNodeId(node.id)}
                                onNodeMouseLeave={() => setHoveredNodeId(null)}
                                fitView
                                deleteKeyCode={null}
                                multiSelectionKeyCode="Shift"
                                panOnDrag={[0, 1, 2]}
                                selectionOnDrag
                                elevateNodesOnSelect={false}
                                autoPanOnNodeDrag={true}
                                zoomOnDoubleClick={true}
                                selectNodesOnDrag={false}
                                onMove={(event, viewport) => {
                                    setViewport(viewport);
                                }}
                                onPaneContextMenu={(e) => {
                                    e.preventDefault();
                                    handlePaneInteraction(e, openMenu);
                                }}
                            >
                                <VisualEditorControls />
                                <Background />
                            </ReactFlow>

                            {/* Collaborative overlays */}
                            {reactFlowInstance && (
                                <>
                                    <CollaborativeCursors flowToScreenPosition={reactFlowInstance.flowToScreenPosition} />
                                    <CollaborativeConnections flowToScreenPosition={reactFlowInstance.flowToScreenPosition} />
                                </>
                            )}

                            <AnimatePresence>
                                {isMenuOpen && <CommandMenu
                                    position={menuPosition}
                                    onClose={closeMenu}
                                    items={menuItems}
                                    onSelect={handleMenuItemSelect}
                                    containerRef={reactFlowWrapper}
                                />}
                            </AnimatePresence>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={20}>
                        {isTraceViewerOpen ? (
                            <TraceStepInfo />
                        ) : debugMode === 'live' ? (
                            <DebugPanel />
                        ) : (
                            <SettingsPanel />
                        )}
                    </ResizablePanel>
                </ResizablePanelGroup>
                <TraceViewer />
                <DebugControls />
                </div>
            </ReactFlowProvider>
        </FadeTransition>
    );
}

export default BotVisualEditorPage;

