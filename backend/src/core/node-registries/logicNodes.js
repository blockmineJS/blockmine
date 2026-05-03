const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const logicNodes = [
  {
    type: 'logic:operation',
    label: '💡 Логика',
    category: 'Логика',
    description: 'Выполняет логическую операцию. Для НЕ (NOT) используется только вход А.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../../core/nodes/logic/operation').evaluate,
    computeInputs: (data) => [
      { id: 'a', name: 'A', type: 'Boolean', required: true, inlineField: true },
      { id: 'b', name: 'B', type: 'Boolean', required: true, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Результат', type: 'Boolean' }
    ],
    defaultData: {}
  },
  {
    type: 'logic:compare',
    label: '⎗ Сравнение',
    category: 'Логика',
    description: 'Сравнивает два значения.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/logic/compare').evaluate,
    computeInputs: (data) => [
      { id: 'a', name: 'A', type: 'Wildcard', required: false, inlineField: true },
      { id: 'b', name: 'B', type: 'Wildcard', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Результат', type: 'Boolean' }
    ],
    defaultData: {}
  },
  {
    type: 'logic:not',
    label: '! НЕ',
    category: 'Логика',
    description: 'Инвертирует boolean значение (NOT).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/logic/not').evaluate,
    computeInputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Результат', type: 'Boolean' }
    ],
    defaultData: { value: false }
  }
];

module.exports = logicNodes;
