/**
 * Регистрация нод категории "Математика"
 */
function registerNodes(registry) {
  const all = 'all';

  registry.registerNodeType({
    type: 'math:operation',
    label: '🔢 Математика',
    category: 'Математика',
    description: 'Выполняет математическую операцию над двумя числами.',
    graphType: all,
    evaluator: require('../nodes/math/operation').evaluate,
    pins: {
      inputs: [
        { id: 'a', name: 'A', type: 'Number', required: true },
        { id: 'b', name: 'B', type: 'Number', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Результат', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'math:random_number',
    label: '🎲 Случайное число',
    category: 'Математика',
    graphType: 'all',
    description: 'Генерирует случайное число в заданном диапазоне.',
    evaluator: require('../nodes/math/random_number').evaluate,
    pins: {
      inputs: [
        { id: 'min', name: 'Мин', type: 'Number' },
        { id: 'max', name: 'Макс', type: 'Number' }
      ],
      outputs: [{ id: 'result', name: 'Результат', type: 'Number' }]
    }
  });
}

module.exports = { registerNodes };
