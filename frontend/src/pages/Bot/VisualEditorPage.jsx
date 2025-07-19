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
import NodePanel from '@/components/visual-editor/NodePanel';
import SettingsPanel from '@/components/visual-editor/SettingsPanel';
import CustomNode from '@/components/visual-editor/CustomNode';
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import CommandMenu from "@/components/ui/CommandMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Share2 } from 'lucide-react';
import { toast } from 'sonner';

const STATS_SERVER_URL = 'http://185.65.200.184:3000';

const nodeTypes = {
    custom: CustomNode,
};

function BotVisualEditorPage() {
    const { botId, commandId, eventId } = useParams();
    const location = useLocation();

    const init = useVisualEditorStore(state => state.init);
    const isLoading = useVisualEditorStore(state => state.isLoading);
    const isSaving = useVisualEditorStore(state => state.isSaving);
    const command = useVisualEditorStore(state => state.command);
    const availableNodes = useVisualEditorStore(state => state.availableNodes);
    const saveGraph = useVisualEditorStore(state => state.saveGraph);
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

    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const reactFlowWrapper = useRef(null);
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
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
    }, [botId, entityId, editorType, init]);

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
    
    const generatedNodeTypes = useMemo(() => {
        if (!availableNodes || Object.keys(availableNodes).length === 0) {
            return { custom: CustomNode };
        }
        
        const allNodeTypes = Object.values(availableNodes).flat();
        const types = {
            ...allNodeTypes.reduce((acc, nodeConfig) => {
                acc[nodeConfig.type] = CustomNode;
                return acc;
            }, {}),
        };
        return types;
    }, [availableNodes]);
    
    const menuItems = useMemo(() => {
        if (!availableNodes) return [];
        return Object.entries(availableNodes).map(([category, nodes]) => ({
            label: category,
            children: nodes.map(node => ({
                label: node.label,
                type: node.type,
            }))
        }));
    }, [availableNodes]);

    const handleMenuItemSelect = (item) => {
        const { menuPosition, addNode, closeMenu } = useVisualEditorStore.getState();
        addNode(item.type, menuPosition.flowPosition);
        closeMenu();
    };

    const handleSave = () => {
        saveGraph(botId);
    };
    
    const handlePaneInteraction = (event, handler) => {
        if (!reactFlowInstance) return;
        
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        handler(event.clientY, event.clientX, position);
    };

    const handleConnectEnd = (event) => {
        if (!connectingPin) return;
        const targetIsPane = event.target.classList.contains('react-flow__pane');
        if (targetIsPane) {
            handlePaneInteraction(event, openMenu);
        }
        setConnectingPin(null);
    };

    const onDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const onDrop = (event) => {
        event.preventDefault();
        if (!reactFlowInstance) return;
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow');
        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
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
                    <div className="flex gap-2">
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
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                    </div>
                </header>
                <ResizablePanelGroup direction="horizontal" className="flex-grow">
                    <ResizablePanel defaultSize={15}>
                        <NodePanel />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={65}>
                        <div className="h-full" ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onConnectStart={onConnectStart}
                                onConnectEnd={handleConnectEnd}
                                nodeTypes={generatedNodeTypes}
                                onInit={setReactFlowInstance}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                fitView
                                deleteKeyCode={['Backspace', 'Delete']}
                                onPaneContextMenu={(e) => {
                                    e.preventDefault();
                                    handlePaneInteraction(e, openMenu);
                                }}
                            >
                                <Controls />
                                <Background />
                            </ReactFlow>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={20}>
                        <SettingsPanel />
                    </ResizablePanel>
                </ResizablePanelGroup>
                {isMenuOpen && <CommandMenu 
                    position={menuPosition}
                    onClose={closeMenu}
                    items={menuItems}
                    onSelect={handleMenuItemSelect}
                />}
            </div>
        </ReactFlowProvider>
    );
}

export default BotVisualEditorPage;

