import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getStraightPath } from 'reactflow';
import { useVisualEditorStore } from '@/stores/visualEditorStore';

/**
 * Кастомный edge компонент с анимацией для трассировки выполнения
 */
export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  source,
  target,
}) {
  const trace = useVisualEditorStore(state => state.trace);
  const currentStepIndex = useVisualEditorStore(state => state.playbackState.currentStepIndex);
  const highlightedNodeIds = useVisualEditorStore(state => state.highlightedNodeIds);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  let isExecuted = false;
  let isActive = false;

  if (trace && currentStepIndex >= 0) {
    const executionSteps = trace.steps.filter(step => step.type !== 'traversal');

    const sourceExecuted = highlightedNodeIds.has(source);
    const targetExecuted = highlightedNodeIds.has(target);

    isExecuted = sourceExecuted && targetExecuted;

    if (currentStepIndex < executionSteps.length) {
      const currentStep = executionSteps[currentStepIndex];
      const previousStep = currentStepIndex > 0 ? executionSteps[currentStepIndex - 1] : null;

      isActive = previousStep?.nodeId === source && currentStep?.nodeId === target;
    }
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isActive ? '#4ade80' : isExecuted ? '#22c55e' : '#94a3b8',
          strokeWidth: isActive ? 4 : isExecuted ? 3 : 2,
          opacity: isExecuted || isActive ? 1 : 0.7,
          transition: 'all 0.3s ease',
        }}
      />
      {isActive && (
        <circle r="4" fill="#4ade80">
          <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}
