const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const debugNodes = [
  {
    type: 'debug:log',
    label: '🐞 Отладка (консоль)',
    category: 'Отладка',
    description: 'Выводит значение в консоль терминала, где запущен бот.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/debug/log').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Exec', type: 'Exec' },
      { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Exec', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#64748b', accentColor: '#94a3b8' }
  }
];

module.exports = debugNodes;