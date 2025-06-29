import React, { useMemo, useRef, useCallback, useEffect } from 'react';
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

  const nodes = useVisualEditorStore(state => state.nodes);
  const edges = useVisualEditorStore(state => state.edges);
  const onNodesChange = useVisualEditorStore(state => state.onNodesChange);
  const onEdgesChange = useVisualEditorStore(state => state.onEdgesChange);
  const onConnect = useVisualEditorStore(state => state.onConnect);
  const onDelete = useVisualEditorStore(state => state.onDelete);
  const availableNodes = useVisualEditorStore(state => state.availableNodes);
  const isMenuOpen = useVisualEditorStore(state => state.isMenuOpen);
  const menuPosition = useVisualEditorStore(state => state.menuPosition);
  const openMenu = useVisualEditorStore(state => state.openMenu);
  const closeMenu = useVisualEditorStore(state => state.closeMenu);
  const setConnectingPin = useVisualEditorStore(state => state.setConnectingPin);
  const connectAndAddNode = useVisualEditorStore(state => state.connectAndAddNode);
  const addNode = useVisualEditorStore(state => state.addNode);
  const connectingPin = useVisualEditorStore(state => state.connectingPin);

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
    if (connectingPin) {
      connectAndAddNode(nodeType, menuPosition.flowPosition);
    } else {
      if (menuPosition && menuPosition.flowPosition) {
        addNode(nodeType, menuPosition.flowPosition);
      }
    }
    closeMenu();
  };

  const onConnectEnd = useCallback(
    (event) => {
      const freshConnectingPin = useVisualEditorStore.getState().connectingPin;
      if (!freshConnectingPin) return;

      const targetIsPane = event.target.classList.contains('react-flow__pane');

      if (targetIsPane) {
        setTimeout(() => {
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            openMenu(event.clientY, event.clientX, position);
        }, 50);
      } else {
        setConnectingPin(null);
      }
    },
    [screenToFlowPosition, openMenu, setConnectingPin]
  );

  const onConnectStart = useCallback((_, { nodeId, handleId, handleType }) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode) return;
    setConnectingPin({ nodeId, handleId, handleType, nodeType: sourceNode.type });
  }, [nodes, setConnectingPin]);

  const filteredNodes = useMemo(() => {
    if (!connectingPin) {
      return availableNodes;
    }
    const allAvailableNodes = Object.values(availableNodes).flat();
    const sourceNodeConfig = allAvailableNodes.find(n => n.type === connectingPin.nodeType);
    if (!sourceNodeConfig) return availableNodes;

    const sourcePin = sourceNodeConfig.outputs.find(p => p.id === connectingPin.handleId);
    if (!sourcePin) return availableNodes;

    const filtered = {};
    Object.entries(availableNodes).forEach(([category, nodesInCategory]) => {
      const compatibleNodes = nodesInCategory.filter(node =>
        node.inputs.some(inputPin => inputPin.type === sourcePin.type || inputPin.type === 'Wildcard' || sourcePin.type === 'Wildcard')
      );
      if (compatibleNodes.length > 0) {
        filtered[category] = compatibleNodes;
      }
    });
    return filtered;
  }, [JSON.stringify(availableNodes)]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    if (isMenuOpen) {
      // Use capture phase to catch event before ReactFlow stops propagation
      document.addEventListener('mousedown', handleClickOutside, true);
    } else {
      document.removeEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isMenuOpen, closeMenu]);

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
        onDragOver={onDragOver}
        onDrop={onDrop}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodesDelete={(nodes) => onDelete(nodes, [])}
        onEdgesDelete={(edges) => onDelete([], edges)}
        deleteKeyCode={['Delete', 'Backspace']}
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
                  {Object.entries(filteredNodes).map(([category, nodes]) => (
                    <CommandGroup key={category} heading={category}>
                      {nodes.map(node => (
                        <CommandItem 
                          key={node.type} 
                          value={node.label} 
                          onSelect={() => handleAddNodeFromMenu(node.type)} 
                          disabled={false}
                        >
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
