import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import 'reactflow/dist/style.css';
import {
    ReactFlow,
    ReactFlowProvider,
    Controls,
    Background,
} from 'reactflow';

import { useVisualEditorStore } from '@/stores/visualEditorStore';
import NodePanel from '@/components/visual-editor/NodePanel';
import SettingsPanel from '@/components/visual-editor/SettingsPanel';
import CustomNode from '@/components/visual-editor/CustomNode';
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import CommandMenu from "@/components/ui/CommandMenu";

const nodeTypes = {
    custom: CustomNode,
};

function BotVisualEditorPage() {
    const { botId, commandId, eventId } = useParams();
    const location = useLocation();

    const {
        init,
        isLoading,
        isSaving,
        command,
        availableNodes,
        saveGraph,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addNode,
        openMenu,
        closeMenu,
        isMenuOpen,
        menuPosition,
        setConnectingPin,
        onConnectStart,
        connectingPin
    } = useVisualEditorStore();

    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const reactFlowWrapper = useRef(null);

    const editorType = location.pathname.includes('/commands/') ? 'command' : 'event';
    const entityId = editorType === 'command' ? commandId : eventId;

    useEffect(() => {
        if (botId && entityId) {
            init(botId, entityId, editorType);
        }
    }, [botId, entityId, editorType, init]);
    
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
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Сохранение...' : 'Сохранить'}
                    </Button>
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

