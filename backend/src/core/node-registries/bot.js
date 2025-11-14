/**
 * Регистрация нод категории "Бот"
 */
function registerNodes(registry) {
  const all = 'all';

  registry.registerNodeType({
    type: 'bot:get_position',
    label: '🤖 Позиция бота',
    category: 'Бот',
    description: 'Возвращает текущую позицию бота в мире.',
    graphType: all,
    evaluator: require('../nodes/bot/get_position').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'position', name: 'Позиция', type: 'Object' }
      ]
    }
  });
}

module.exports = { registerNodes };
