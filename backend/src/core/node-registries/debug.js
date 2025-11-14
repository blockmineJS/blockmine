const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Отладка"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'debug:log',
    label: '🐞 Отладка (консоль)',
    category: 'Отладка',
    description: 'Выводит значение в консоль терминала, где запущен бот.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/debug/log').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Exec', type: 'Exec' },
        { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
      ],
      outputs: [
        { id: 'exec', name: 'Exec', type: 'Exec' }
      ]
    }
  });
}

module.exports = { registerNodes };
