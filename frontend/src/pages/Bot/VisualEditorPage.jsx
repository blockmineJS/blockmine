import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import 'reactflow/dist/style.css';
import {
    ReactFlow,
    ReactFlowProvider,
    Controls,
    Background,
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
import { Upload, Share2, Zap, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { initializeVisualEditor } from '@/components/visual-editor/initVisualEditor';
import NodeRegistry from '@/components/visual-editor/nodes';
import { apiHelper } from '@/lib/api';
import CollaborativeUsersHeader from '@/components/visual-editor/CollaborativeUsersHeader';
import CollaborativeCursors from '@/components/visual-editor/CollaborativeCursors';
import CollaborativeConnections from '@/components/visual-editor/CollaborativeConnections';

initializeVisualEditor();

const STATS_SERVER_URL = 'http://185.65.200.184:3000';

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

function BotVisualEditorPage() {
    const { botId, commandId, eventId } = useParams();
    const location = useLocation();

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
    const debugMode = useVisualEditorStore(state => state.debugMode);
    const setDebugMode = useVisualEditorStore(state => state.setDebugMode);
    const socket = useVisualEditorStore(state => state.socket);
    const setViewport = useVisualEditorStore(state => state.setViewport);

    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const reactFlowWrapper = useRef(null);
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [showEventTypeDialog, setShowEventTypeDialog] = useState(false);
    const [availableEventTypes, setAvailableEventTypes] = useState([]);
    const [publishForm, setPublishForm] = useState({
        name: '',
        author: '',
        description: ''
    });
    const [categories, setCategories] = useState([]);

    const editorType = location.pathname.includes('/commands/') ? 'command' : 'event';
    const entityId = editorType === 'command' ? commandId : eventId;

    useEffect(() => {
        if (botId && entityId) {
            init(botId, entityId, editorType);
        }

        return () => {
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
            setBotName(bot.username || bot.name || `Бот ${botId}`);
        } else {
            setBotName(`Бот ${botId}`);
        }
    }, [botId, bots]);

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

    // Global mouse tracking для collaborative cursors
    useEffect(() => {
        if (!socket || !command || !reactFlowInstance) return;

        const handleMouseMove = (event) => {
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

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

    const loadCategories = async () => {
        try {
            const response = await fetch(`${STATS_SERVER_URL}/api/graphs/categories`);
            const data = await response.json();
            setCategories(data);
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
        }
    };

    const handleViewLastTrace = async (selectedEventType = null) => {
        try {
            console.log('[handleViewLastTrace] Called with:', { selectedEventType, type: typeof selectedEventType });

            const graphId = entityId === 'new' ? null : parseInt(entityId);
            if (!graphId) {
                toast.error('Сохраните граф перед просмотром трассировок');
                return;
            }

            // Если eventType не указан, проверяем сколько event нод в графе
            if (!selectedEventType) {
                const eventNodes = nodes.filter(n => n.type?.startsWith('event:'));

                if (eventNodes.length === 0) {
                    toast.error('В графе нет event нод');
                    return;
                }

                // Если больше одной event ноды, открываем диалог выбора
                if (eventNodes.length > 1) {
                    // Сохраняем event ноды для диалога
                    const types = eventNodes.map(n => ({
                        type: n.type.replace('event:', ''),
                        label: NodeRegistry.get(n.type)?.label || n.type
                    }));
                    console.log('[handleViewLastTrace] Setting availableEventTypes:', types);
                    setAvailableEventTypes(types);
                    setShowEventTypeDialog(true);
                    return;
                } else {
                    // Если только одна event нода, используем её
                    selectedEventType = eventNodes[0].type.replace('event:', '');
                }
            }

            console.log('[handleViewLastTrace] Making API call with eventType:', selectedEventType);

            const url = selectedEventType
                ? `/api/traces/${botId}/graph/${graphId}/last?eventType=${selectedEventType}`
                : `/api/traces/${botId}/graph/${graphId}/last`;

            console.log('[handleViewLastTrace] URL:', url);

            const response = await apiHelper(url);
            console.log('[VisualEditorPage] Trace API response:', {
                success: response.success,
                hasTrace: !!response.trace,
                traceStepsCount: response.trace?.steps?.length,
                traceData: response.trace
            });

            if (response.success && response.trace) {
                useVisualEditorStore.getState().openTraceViewer(response.trace);
            } else {
                toast.error('Трассировки не найдены для этого графа');
            }
        } catch (error) {
            console.error('Ошибка загрузки трассировки:', error);
            toast.error('Не удалось загрузить трассировку');
        }
    };

    const handlePublish = async () => {
        try {
            if (!publishForm.name || !publishForm.author || !publishForm.description) {
                toast.error('Все поля обязательны');
                return;
            }

            if (publishForm.description.length < 10) {
                toast.error('Описание должно содержать минимум 10 символов');
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

            const response = await fetch(`${STATS_SERVER_URL}/api/graphs/publish`, {
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
                toast.success('Граф опубликован и ожидает модерации!');
                setPublishDialogOpen(false);
                setPublishForm({
                    name: '',
                    author: '',
                    description: ''
                });
            } else {
                const error = await response.json();
                toast.error(error.error || 'Ошибка при публикации');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            toast.error('Ошибка при публикации графа');
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
                    label: `📤 Получить переменную ${variable.name}`,
                    type: 'data:get_variable',
                    data: { variableName: variable.name }
                });
                variableItems.push({
                    label: `📥 Задать переменную ${variable.name}`,
                    type: 'action:bot_set_variable',
                    data: { variableName: variable.name }
                });
            });
            dynamicGroups.push({
                label: '📦 Переменные',
                children: variableItems
            });
        }

        // Добавляем группу аргументов
        if (commandArguments && commandArguments.length > 0) {
            const argumentItems = commandArguments.map(arg => ({
                label: `📤 Получить аргумент ${arg.name}`,
                type: 'data:get_argument',
                data: { argumentName: arg.name }
            }));
            dynamicGroups.push({
                label: '🎯 Аргументы',
                children: argumentItems
            });
        }

        const staticGroups = Object.entries(availableNodes).map(([category, nodes]) => ({
            label: category,
            children: nodes.map(node => ({
                label: node.label,
                type: node.type,
            }))
        }));

        return [...dynamicGroups, ...staticGroups];
    }, [availableNodes, variables, commandArguments]);

    const handleMenuItemSelect = (item) => {
        const { menuPosition, addNode, closeMenu, socket, command } = useVisualEditorStore.getState();
        const newNode = addNode(item.type, menuPosition.flowPosition, false);

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
        if (!reactFlowInstance) return;

        const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        handler(event.clientY, event.clientX, position);
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

    if (isLoading || Object.keys(availableNodes).length === 0) {
        return <div className="flex items-center justify-center h-full">Загрузка редактора...</div>;
    }

    return (
        <ReactFlowProvider>
            <div className="h-full w-full flex flex-col">
                 <header className="p-2 border-b flex justify-between items-center">
                    <h1 className="text-lg font-bold">Редактор: {command?.name}</h1>
                    <div className="flex gap-2 items-center">
                        <CollaborativeUsersHeader />
                        <Button
                            variant={debugMode === 'live' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setDebugMode(debugMode === 'live' ? 'normal' : 'live')}
                        >
                            <Bug className="w-4 h-4 mr-2" />
                            {debugMode === 'live' ? 'Live Debug Вкл' : 'Live Debug'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewLastTrace()}>
                            <Zap className="w-4 h-4 mr-2" />
                            Просмотр трассировки
                        </Button>
                        <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Опубликовать
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Опубликовать граф в магазин</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Название</Label>
                                        <Input
                                            id="name"
                                            value={publishForm.name}
                                            onChange={(e) => setPublishForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Название графа"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="author">Автор</Label>
                                        <Input
                                            id="author"
                                            value={publishForm.author}
                                            onChange={(e) => setPublishForm(prev => ({ ...prev, author: e.target.value }))}
                                            placeholder="Ваше имя"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="description">Описание</Label>
                                        <Textarea
                                            id="description"
                                            value={publishForm.description}
                                            onChange={(e) => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Описание графа (минимум 10 символов)"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={handlePublish} className="flex-1">
                                            Опубликовать
                                        </Button>
                                        <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
                                            Отмена
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Dialog open={showEventTypeDialog} onOpenChange={setShowEventTypeDialog}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Выберите тип события для просмотра</DialogTitle>
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
                                                handleViewLastTrace(eventType.type);
                                            }}
                                        >
                                            {eventType.label}
                                        </Button>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
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
                        <div className="h-full" ref={reactFlowWrapper}>
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
                                fitView
                                deleteKeyCode={['Backspace', 'Delete']}
                                elevateNodesOnSelect={false}
                                autoPanOnNodeDrag={true}
                                zoomOnDoubleClick={true}
                                selectNodesOnDrag={true}
                                onMove={(event, viewport) => {
                                    setViewport(viewport);
                                }}
                                onPaneContextMenu={(e) => {
                                    e.preventDefault();
                                    handlePaneInteraction(e, openMenu);
                                }}
                            >
                                <Controls />
                                <Background />
                            </ReactFlow>

                            {/* Collaborative overlays */}
                            {reactFlowInstance && (
                                <>
                                    <CollaborativeCursors flowToScreenPosition={reactFlowInstance.flowToScreenPosition} />
                                    <CollaborativeConnections flowToScreenPosition={reactFlowInstance.flowToScreenPosition} />
                                </>
                            )}
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
                {isMenuOpen && <CommandMenu
                    position={menuPosition}
                    onClose={closeMenu}
                    items={menuItems}
                    onSelect={handleMenuItemSelect}
                />}
                <TraceViewer />
                <DebugControls />
            </div>
        </ReactFlowProvider>
    );
}

export default BotVisualEditorPage;

