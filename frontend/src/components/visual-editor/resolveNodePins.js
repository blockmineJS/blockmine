import {
  isDynamicNodeType,
  computeDynamicInputs,
  computeDynamicOutputs,
  withVariablePins,
} from '@node-catalog';

export function resolveNodePins(type, data, context, remoteNode, definition) {
  if (isDynamicNodeType(type)) {
    return {
      inputs: withVariablePins(computeDynamicInputs(type, data, context) || [], data),
      outputs: computeDynamicOutputs(type, data, context) || [],
    };
  }

  if (remoteNode?.pins && remoteNode.dynamicPins !== true) {
    return {
      inputs: withVariablePins(remoteNode.pins.inputs || [], data),
      outputs: remoteNode.pins.outputs || [],
    };
  }

  return {
    inputs: definition?.getInputs?.(data, context) || [],
    outputs: definition?.getOutputs?.(data, context) || [],
  };
}
