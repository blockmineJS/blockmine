const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const botNodes = [
  {
    type: 'bot:stop',
    label: '🔴 Выключить бота',
    category: 'Бот',
    description: 'Останавливает бота.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/bot/stop_bot').execute,
    computeInputs: () => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' }
    ],
    computeOutputs: () => [],
    defaultData: {},
    theme: { headerColor: '#dc2626', accentColor: '#ef4444' }
  },
  {
    type: 'bot:get_position',
    label: '🤖 Позиция бота',
    category: 'Бот',
    description: 'Возвращает текущую позицию бота в мире.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/bot/get_position').evaluate,
    computeInputs: () => [],
    computeOutputs: () => [
      { id: 'position', name: 'Позиция', type: 'Object' }
    ],
    defaultData: {},
    theme: { headerColor: '#059669', accentColor: '#10b981' }
  },
  {
    type: 'bot:get_name',
    label: '🤖 Имя бота',
    category: 'Бот',
    description: 'Возвращает имя (username) бота.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/bot/get_name').evaluate,
    computeInputs: () => [],
    computeOutputs: () => [
      { id: 'name', name: 'Имя', type: 'String' }
    ],
    defaultData: {},
    theme: { headerColor: '#3b82f6', accentColor: '#60a5fa' }
  }
];

module.exports = botNodes;