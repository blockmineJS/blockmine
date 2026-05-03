const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const typeNodes = [
  {
    type: 'type:to_string',
    label: '📝 В строку',
    category: 'Типы',
    description: 'Преобразует любое значение в строку (toString).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/type/to_string').evaluate,
    computeInputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Wildcard', required: false }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Result', type: 'String' }
    ],
    defaultData: {},
    theme: { headerColor: '#0891b2', accentColor: '#06b6d4' }
  }
];

module.exports = typeNodes;