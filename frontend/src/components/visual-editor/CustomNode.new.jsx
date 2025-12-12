import React, { useMemo, useCallback, useRef } from 'react';
import { useVisualEditorStore } from '@/stores/visualEditorStore';
import NodeRegistry from './nodes';
import BaseNode from './core/base/BaseNode';
import { useNodeTranslation } from './hooks/useNodeTranslation';

function CustomNode({ data, type, id: nodeId }) {
  const updateNodeData = useVisualEditorStore(state => state.updateNodeData);
  const variables = useVisualEditorStore(state => state.variables);
  const commandArguments = useVisualEditorStore(state => state.commandArguments);
  const edges = useVisualEditorStore(state => state.edges);
  const availableNodes = useVisualEditorStore(state => state.availableNodes);
  const trace = useVisualEditorStore(state => state.trace);
  const currentStepIndex = useVisualEditorStore(state => state.playbackState.currentStepIndex);
  const highlightedNodeIds = useVisualEditorStore(state => state.highlightedNodeIds);
  const currentActiveNodeId = useVisualEditorStore(state => state.currentActiveNodeId);
  const isTraceViewerOpen = useVisualEditorStore(state => state.isTraceViewerOpen);
  const breakpoints = useVisualEditorStore(state => state.breakpoints);
  const debugSession = useVisualEditorStore(state => state.debugSession);

  // i18n переводы для нод
  const { getNodeTranslation, getPinName, getPinDescription, getPlaceholder } = useNodeTranslation();

  const nodeEdges = useMemo(
    () => edges.filter(e => e.target === nodeId || e.source === nodeId),
    [edges, nodeId]
  );

  const definition = NodeRegistry.get(type);

  const nodeConfig = useMemo(() =>
    Object.values(availableNodes).flat().find(n => n.type === type),
    [availableNodes, type]
  );

  const context = useMemo(
    () => ({ variables, commandArguments }),
    [variables, commandArguments]
  );

  // Функция для перевода пинов
  const translatePins = useCallback((pins) => {
    if (!pins || !Array.isArray(pins)) return pins;
    return pins.map(pin => ({
      ...pin,
      name: getPinName(type, pin.id, pin.name),
      description: getPinDescription(type, pin.id, pin.description),
      placeholder: pin.placeholder ? getPlaceholder(type, pin.id, pin.placeholder) : pin.placeholder,
    }));
  }, [type, getPinName, getPinDescription, getPlaceholder]);

  const inputs = useMemo(
    () => definition ? translatePins(definition.getInputs(data, context)) : [],
    [definition, data, context, translatePins]
  );

  const outputs = useMemo(
    () => definition ? translatePins(definition.getOutputs(data, context)) : [],
    [definition, data, context, translatePins]
  );

  // Получаем переведённые label и description
  const nodeTranslation = useMemo(
    () => getNodeTranslation(type),
    [type, getNodeTranslation]
  );

  // Получаем inputs и outputs из trace для текущего шага, если воспроизводится трассировка
  const traceData = useMemo(() => {
    if (!trace || currentStepIndex < 0) return { inputs: null, outputs: null };

    const executionSteps = trace.steps.filter(step => step.type !== 'traversal');
    if (currentStepIndex >= executionSteps.length) return { inputs: null, outputs: null };

    // Находим шаг для текущей ноды до или на текущем индексе
    const stepsUpToCurrent = executionSteps.slice(0, currentStepIndex + 1);
    const nodeStep = stepsUpToCurrent.reverse().find(step => step.nodeId === nodeId);

    const inputs = nodeStep?.inputs || null;
    const outputs = nodeStep?.outputs || null;

    return { inputs, outputs };
  }, [trace, currentStepIndex, nodeId, type]);

  // Получаем данные из Live debug сессии (если на паузе на этой ноде)
  const liveDebugData = useMemo(() => {
    if (!debugSession || debugSession.status !== 'paused') {
      return { inputs: null, outputs: null };
    }

    // Если это текущая нода на паузе - показываем её inputs
    if (debugSession.nodeId === nodeId) {
      return {
        inputs: debugSession.inputs || null,
        outputs: null // outputs будут после выполнения
      };
    }

    // Если это не текущая нода, ищем её в executedSteps
    if (debugSession.executedSteps?.steps) {
      console.log(`[CustomNode] Looking for node ${nodeId} in executedSteps:`, debugSession.executedSteps.steps.length, 'steps');
      const executionSteps = debugSession.executedSteps.steps.filter(step => step.type !== 'traversal');
      console.log(`[CustomNode] After filtering traversals:`, executionSteps.length, 'steps');
      const nodeStep = executionSteps.reverse().find(step => step.nodeId === nodeId);

      if (nodeStep) {
        console.log(`[CustomNode] Found step for node ${nodeId}:`, nodeStep);
        return {
          inputs: nodeStep.inputs || null,
          outputs: nodeStep.outputs || null
        };
      } else {
        console.log(`[CustomNode] No step found for node ${nodeId}`);
      }
    }

    return { inputs: null, outputs: null };
  }, [debugSession, nodeId]);

  // Комбинируем данные: приоритет у Live debug, потом trace
  const displayData = useMemo(() => {
    if (liveDebugData.inputs || liveDebugData.outputs) {
      return liveDebugData;
    }
    return traceData;
  }, [liveDebugData, traceData]);

  if (definition) {
    const breakpoint = breakpoints.get(nodeId);

    return (
      <BaseNode
        nodeId={nodeId}
        type={type}
        label={nodeTranslation.label || definition.label}
        description={nodeTranslation.description || definition.description}
        inputs={inputs}
        outputs={outputs}
        SettingsComponent={definition.SettingsComponent}
        data={data}
        updateNodeData={updateNodeData}
        theme={definition.theme}
        context={context}
        nodeEdges={nodeEdges}
        traceInputs={displayData.inputs}
        traceOutputs={displayData.outputs}
        isHighlighted={highlightedNodeIds.has(nodeId)}
        isActiveNode={currentActiveNodeId === nodeId}
        isTraceActive={isTraceViewerOpen}
        breakpoint={breakpoint}
        isPausedNode={debugSession?.status === 'paused' && debugSession?.nodeId === nodeId}
      />
    );
  }

  if (!nodeConfig) {
    return (
      <div className="min-w-64 bg-red-900 border-red-600 text-white p-4 rounded">
        <p className="font-bold">Error</p>
        <p className="text-sm">Unknown node type: {type}</p>
        <p className="text-xs mt-2">Node not found in registry</p>
      </div>
    );
  }

  return (
    <div className="min-w-64 bg-yellow-900 border-yellow-600 text-white p-4 rounded">
      <p className="font-bold">{nodeConfig.name || type}</p>
      <p className="text-sm">Legacy node</p>
      <p className="text-xs mt-2">Migration required</p>
    </div>
  );
}

// Кастомный компаратор для React.memo - ререндер только если изменились важные props
function arePropsEqual(prevProps, nextProps) {
  // Не ререндерим если изменилась только позиция (selected, dragging и т.д.)
  //
  // ВАЖНО: Поверхностное сравнение data безопасно, потому что:
  // 1. visualEditorStore использует Immer middleware (см. visualEditorStore.js)
  // 2. Immer гарантирует создание новых ссылок на объекты при любом изменении
  // 3. Все обновления data идут через updateNodeData, который использует Immer
  // 4. Поэтому если data изменился - ссылка будет другая, если не изменился - та же
  //
  // Глубокое сравнение НЕ требуется и было бы избыточным.
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
