import React, { useMemo, useRef, useCallback, useState } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { useReactFlow } from 'reactflow';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

import { useVisualEditorStore } from '@/stores/visualEditorStore';
import CustomNode from './CustomNode';

const VisualEditorCanvas = () => {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();
  const [menuPosition, setMenuPosition] = useState(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    availableNodes,
    addNode
  } = useVisualEditorStore();

  const nodeTypes = useMemo(() => {
    const types = {};
    Object.values(availableNodes).flat().forEach(node => {
      types[node.type] = CustomNode;
    });
    return types;
  }, [availableNodes]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );
  
  const handleContextMenu = (event) => {
      event.preventDefault();
      setMenuPosition({ top: event.clientY, left: event.clientX });
  };

  const handleAddNodeFromMenu = (nodeType) => {
      addNode(nodeType, screenToFlowPosition(menuPosition));
      setMenuPosition(null);
  };

  return (
    <div style={{ height: '100%', width: '100%' }} ref={reactFlowWrapper} onDragOver={onDragOver} onDrop={onDrop} onContextMenu={handleContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      {menuPosition && (
          <div style={{ top: menuPosition.top, left: menuPosition.left, position: 'absolute', zIndex: 10 }}>
            <ContextMenu open={true} onOpenChange={() => setMenuPosition(null)}>
                <ContextMenuTrigger />
                <ContextMenuContent>
                    {Object.entries(availableNodes).map(([category, nodes]) => (
                        <React.Fragment key={category}>
                        {nodes.map(node => (
                            <ContextMenuItem key={node.type} onClick={() => handleAddNodeFromMenu(node.type)}>{node.label}</ContextMenuItem>
                        ))}
                        </React.Fragment>
                    ))}
                </ContextMenuContent>
            </ContextMenu>
          </div>
      )}
    </div>
  );
};

export default VisualEditorCanvas;
