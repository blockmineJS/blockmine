const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Логика"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'logic:operation',
    label: '💡 Логика',
    category: 'Логика',
    description: 'Выполняет логическую операцию. Для НЕ (NOT) используется только вход А.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../nodes/logic/operation').evaluate,
    pins: {
      inputs: [
        { id: 'a', name: 'A', type: 'Boolean', required: true },
        { id: 'b', name: 'B', type: 'Boolean', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Результат', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'logic:compare',
    label: '⎗ Сравнение',
    category: 'Логика',
    description: 'Сравнивает два значения.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/logic/compare').evaluate,
    pins: {
      inputs: [
        { id: 'a', name: 'A', type: 'Wildcard' },
        { id: 'b', name: 'B', type: 'Wildcard' }
      ],
      outputs: [
        { id: 'result', name: 'Результат', type: 'Boolean' }
      ]
    }
  });
}

module.exports = { registerNodes };
