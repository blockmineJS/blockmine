import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactFlow, { Background, Controls, useReactFlow, useKeyPress } from 'reactflow';
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
import CustomNode from './CustomNode.new';
import CollaborativeCursors from './CollaborativeCursors';
import CollaborativeConnections from './CollaborativeConnections';
import { useNodeTranslation } from './hooks/useNodeTranslation';

const VisualEditorCanvas = () => {
  const { t } = useTranslation('visual-editor');
  const { getNodeTranslation } = useNodeTranslation();
  const reactFlowWrapper = useRef(null);
  const menuRef = useRef(null);
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();

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
  const command = useVisualEditorStore(state => state.command);
  const variables = useVisualEditorStore(state => state.variables);
  const commandArguments = useVisualEditorStore(state => state.commandArguments);
  const socket = useVisualEditorStore(state => state.socket);

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

  const handleAddNodeFromMenu = (nodeType, nodeData = {}) => {
    if (connectingPin) {
      connectAndAddNode(nodeType, menuPosition.flowPosition);
    } else {
      if (menuPosition && menuPosition.flowPosition) {
        const newNode = addNode(nodeType, menuPosition.flowPosition, false);
        if (Object.keys(nodeData).length > 0) {
          newNode.data = { ...newNode.data, ...nodeData };
        }
        useVisualEditorStore.setState(state => {
          state.nodes.push(newNode);
        });
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

      // Broadcast завершение создания соединения
      if (socket && command) {
        socket.emit('collab:connection-end', {
          botId: command.botId,
          graphId: command.id,
        });
      }
    },
    [screenToFlowPosition, openMenu, setConnectingPin, socket, command]
  );

  const onConnectStart = useCallback((event, { nodeId, handleId, handleType }) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode) return;
    setConnectingPin({ nodeId, handleId, handleType, nodeType: sourceNode.type });

    // Broadcast начало создания соединения
    if (socket && command) {
      const position = screenToFlowPosition({
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
  }, [nodes, setConnectingPin, socket, command, screenToFlowPosition]);

  const filteredNodes = useMemo(() => {
    if (!connectingPin) {
      return availableNodes;
    }
    const allAvailableNodes = Object.values(availableNodes).flat();
    const sourceNodeConfig = allAvailableNodes.find(n => n.type === connectingPin.nodeType);
    if (!sourceNodeConfig) return availableNodes;

    const sourcePin = (sourceNodeConfig.pins?.outputs || sourceNodeConfig.outputs || []).find(p => p.id === connectingPin.handleId);
    if (!sourcePin) return availableNodes;

    const filtered = {};
    Object.entries(availableNodes).forEach(([category, nodesInCategory]) => {
      const compatibleNodes = nodesInCategory.filter(node => {
        const nodeInputs = node.pins?.inputs || node.inputs || [];
        return nodeInputs.some(inputPin => inputPin.type === sourcePin.type || inputPin.type === 'Wildcard' || sourcePin.type === 'Wildcard');
      });
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
      document.addEventListener('mousedown', handleClickOutside, true);
    } else {
      document.removeEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isMenuOpen, closeMenu]);

  return (
    <div
      style={{ height: '100%', width: '100%', position: 'relative' }}
      ref={reactFlowWrapper}
    >
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

      {/* Collaborative overlays - рендерим вне ReactFlow для правильного позиционирования */}
      <CollaborativeCursors flowToScreenPosition={flowToScreenPosition} />
      <CollaborativeConnections flowToScreenPosition={flowToScreenPosition} />
      {isMenuOpen && (
          <div
            ref={menuRef}
            style={{ top: menuPosition.top, left: menuPosition.left, position: 'absolute', zIndex: 10 }}
          >
            <Command>
              <CommandInput placeholder={t('contextMenu.searchPlaceholder')} />
              <CommandList>
                <CommandEmpty>{t('contextMenu.noResults')}</CommandEmpty>

                  {variables && variables.length > 0 && (
                    <CommandGroup heading={t('contextMenu.variablesGroup')}>
                      {variables.map(variable => (
                        <React.Fragment key={`var-${variable.id}`}>
                          <CommandItem
                            value={t('contextMenu.getVariable', { name: variable.name })}
                            onSelect={() => handleAddNodeFromMenu('data:get_variable', { variableName: variable.name })}
                          >
                            {t('contextMenu.getVariable', { name: variable.name })}
                          </CommandItem>
                          <CommandItem
                            value={t('contextMenu.setVariable', { name: variable.name })}
                            onSelect={() => handleAddNodeFromMenu('action:bot_set_variable', { variableName: variable.name })}
                          >
                            {t('contextMenu.setVariable', { name: variable.name })}
                          </CommandItem>
                        </React.Fragment>
                      ))}
                    </CommandGroup>
                  )}

                  {commandArguments && commandArguments.length > 0 && (
                    <CommandGroup heading={t('contextMenu.argumentsGroup')}>
                      {commandArguments.map(arg => (
                        <CommandItem
                          key={`arg-${arg.id}`}
                          value={t('contextMenu.getArgument', { name: arg.name })}
                          onSelect={() => handleAddNodeFromMenu('data:get_argument', { argumentName: arg.name })}
                        >
                          {t('contextMenu.getArgument', { name: arg.name })}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Обычные ноды */}
                  {Object.entries(filteredNodes).map(([category, nodes]) => (
                    <CommandGroup key={category} heading={t(`nodePanel.categories.${category}`, category)}>
                      {nodes.map(node => {
                        const nodeLabel = getNodeTranslation(node.type).label || node.label;
                        return (
                          <CommandItem
                            key={node.type}
                            value={nodeLabel}
                            onSelect={() => handleAddNodeFromMenu(node.type)}
                            disabled={false}
                          >
                            {nodeLabel}
                          </CommandItem>
                        );
                      })}
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
