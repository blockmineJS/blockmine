import NodeDefinition from './NodeDefinition';

export function createNodeFromJSON(json) {
  return new NodeDefinition({
    type: json.type,
    category: json.category,
    label: json.label,
    description: json.description || '',
    computeInputs: () => json.pins?.inputs || [],
    computeOutputs: () => json.pins?.outputs || [],
    defaultData: json.defaultData || {},
    theme: json.theme || {},
    graphType: json.graphType || 'ALL',
    inlineFields: json.inlineFields || [],
    settingsFields: json.settingsFields || [],
  });
}

export function nodeFromJSON(json) {
  return createNodeFromJSON(json);
}

export default NodeDefinition;