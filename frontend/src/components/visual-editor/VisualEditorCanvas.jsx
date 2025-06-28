import React, { useMemo, useRef, useCallback } from 'react';
import ReactFlow, { Background, Controls, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { useVisualEditorStore } from '@/stores/visualEditorStore';
import CustomNode from './CustomNode';

const VisualEditorCanvas = () => {
  const reactFlowWrapper = useRef(null);
  const menuRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    availableNodes,
    addNode,
    isMenuOpen,
    menuPosition,
    openMenu,
    closeMenu
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

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      openMenu(event.clientY, event.clientX, position);
    },
    [screenToFlowPosition]
  );

  const handleAddNodeFromMenu = (nodeType) => {
      if (menuPosition && menuPosition.flowPosition) {
          addNode(nodeType, menuPosition.flowPosition);
      }
      closeMenu();
  };

  const handlePaneClick = useCallback((event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      closeMenu();
    }
  }, [closeMenu])

  return (
    <div style={{ height: '100%', width: '100%' }} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onPaneContextMenu={onPaneContextMenu}
        onPaneClick={handlePaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      {isMenuOpen && (
          <div
            ref={menuRef}
            style={{ top: menuPosition.top, left: menuPosition.left, position: 'absolute', zIndex: 10 }}
          >
            <Command>
              <CommandInput placeholder="Type a command or search..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                  {Object.entries(availableNodes).map(([category, nodes]) => (
                    <CommandGroup key={category} heading={category}>
                      {nodes.map(node => (
                        <CommandItem key={node.type} value={node.type} onSelect={() => handleAddNodeFromMenu(node.type)} disabled={false}>
                          {node.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
              </CommandList>
            </Command>
          </div>
      )}
    </div>
  );
};

export default VisualEditorCanvas;
