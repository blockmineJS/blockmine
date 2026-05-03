const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const botNodes = [
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
  }
];

module.exports = botNodes;