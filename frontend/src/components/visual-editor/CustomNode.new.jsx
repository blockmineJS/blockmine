import React, { useMemo, useCallback, useRef } from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import NodeRegistry from './nodes';
import BaseNode from './core/base/BaseNode';

function CustomNode({ data, type, id: nodeId }) {
  const updateNodeData = useVisualEditorStore(state => state.updateNodeData);
  const variables = useVisualEditorStore(state => state.variables);
  const commandArguments = useVisualEditorStore(state => state.commandArguments);
  const edges = useVisualEditorStore(state => state.edges);
  const availableNodes = useVisualEditorStore(state => state.availableNodes);

  const nodeEdges = useMemo(
    () => edges.filter(e => e.target === nodeId || e.source === nodeId),
    [edges, nodeId]
  );

  const definition = NodeRegistry.get(type);

  const nodeConfig = useMemo(() =>
    Object.values(availableNodes).flat().find(n => n.type === type),
    [availableNodes, type]
  );

  if (definition) {
    const context = { variables, commandArguments };

    const inputs = useMemo(
      () => definition.getInputs(data, context),
      [definition, data, variables, commandArguments]
    );

    const outputs = useMemo(
      () => definition.getOutputs(data, context),
      [definition, data, variables, commandArguments]
    );

    return (
      <BaseNode
        nodeId={nodeId}
        type={type}
        label={definition.label}
        description={definition.description}
        inputs={inputs}
        outputs={outputs}
        SettingsComponent={definition.SettingsComponent}
        data={data}
        updateNodeData={updateNodeData}
        theme={definition.theme}
        context={context}
        nodeEdges={nodeEdges}
      />
    );
  }

  if (!nodeConfig) {
    return (
      <div className="min-w-64 bg-red-900 border-red-600 text-white p-4 rounded">
        <p className="font-bold">Ошибка</p>
        <p className="text-sm">Неизвестный тип ноды: {type}</p>
        <p className="text-xs mt-2">Нода не найдена ни в новом реестре, ни в старой системе</p>
      </div>
    );
  }

  return (
    <div className="min-w-64 bg-yellow-900 border-yellow-600 text-white p-4 rounded">
      <p className="font-bold">{nodeConfig.name || type}</p>
      <p className="text-sm">Нода использует старую систему</p>
      <p className="text-xs mt-2">Требуется миграция на новую архитектуру</p>
    </div>
  );
}

// Кастомный компаратор для React.memo - ререндер только если изменились важные props
function arePropsEqual(prevProps, nextProps) {
  // Не ререндерим если изменилась только позиция (selected, dragging и т.д.)
  // Глубокое сравнение data для избежания ложных ререндеров
  if (prevProps.id !== nextProps.id || prevProps.type !== nextProps.type) {
    return false;
  }

  const prevData = prevProps.data;
  const nextData = nextProps.data;

  if (prevData === nextData) return true;
  if (!prevData || !nextData) return false;

  const prevKeys = Object.keys(prevData);
  const nextKeys = Object.keys(nextData);

  if (prevKeys.length !== nextKeys.length) return false;

  for (let key of prevKeys) {
    if (prevData[key] !== nextData[key]) {
      return false;
    }
  }

  return true;
}

export default React.memo(CustomNode, arePropsEqual);
