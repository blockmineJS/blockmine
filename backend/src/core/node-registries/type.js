const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Преобразование типов"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'type:to_string',
    label: '📝 В строку',
    category: 'Типы',
    description: 'Преобразует любое значение в строку (toString).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/type/to_string').evaluate,
    pins: {
      inputs: [
        { id: 'value', name: 'Значение', type: 'Wildcard', required: false }
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'String' }
      ]
    }
  });
}

module.exports = { registerNodes };
