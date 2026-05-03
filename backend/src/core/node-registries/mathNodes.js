const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const mathNodes = [
  {
    type: 'math:operation',
    label: '🔢 Математика',
    category: 'Математика',
    description: 'Выполняет математическую операцию над двумя числами.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/math/operation').evaluate,
    computeInputs: (data) => [
      { id: 'a', name: 'A', type: 'Number', required: true, inlineField: true, placeholder: '0' },
      { id: 'b', name: 'B', type: 'Number', required: true, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Результат', type: 'Number' }
    ],
    defaultData: { a: 0, b: 0 }
  },
  {
    type: 'math:random_number',
    label: '🎲 Случайное число',
    category: 'Математика',
    graphType: GRAPH_TYPES.ALL,
    description: 'Генерирует случайное число в заданном диапазоне.',
    evaluator: require('../../core/nodes/math/random_number').evaluate,
    computeInputs: (data) => [
      { id: 'min', name: 'Мин', type: 'Number', required: false, inlineField: true, placeholder: '0' },
      { id: 'max', name: 'Макс', type: 'Number', required: false, inlineField: true, placeholder: '100' }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Результат', type: 'Number' }
    ],
    defaultData: { min: 0, max: 100 }
  }
];

module.exports = mathNodes;
