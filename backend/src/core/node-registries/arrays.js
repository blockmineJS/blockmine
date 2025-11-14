const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Массивы"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'array:get_random_element',
    label: '🎲 Случайный элемент',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Возвращает случайный элемент из массива и его индекс.',
    evaluator: require('../nodes/arrays/get_random_element').evaluate,
    pins: {
      inputs: [
        { id: 'array', name: 'Массив', type: 'Array', required: true }
      ],
      outputs: [
        { id: 'element', name: 'Элемент', type: 'Any' },
        { id: 'index', name: 'Индекс', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'array:contains',
    label: '🔍 Массив: Содержит',
    category: 'Массив',
    description: 'Проверяет, содержит ли массив указанный элемент и возвращает его индекс.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/arrays/contains').evaluate,
    pins: {
      inputs: [
        { id: 'array', name: 'Массив', type: 'Array', required: true },
        { id: 'element', name: 'Элемент', type: 'Wildcard', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Найден', type: 'Boolean' },
        { id: 'index', name: 'Индекс', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'array:get_by_index',
    label: '📦 Элемент по индексу',
    category: 'Массив',
    description: 'Получает элемент массива по его индексу.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/arrays/get_by_index').evaluate,
    pins: {
      inputs: [
        { id: 'array', name: 'Массив', type: 'Array', required: true },
        { id: 'index', name: 'Индекс', type: 'Number', required: true }
      ],
      outputs: [
        { id: 'element', name: 'Элемент', type: 'Any' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'array:get_next',
    label: '➡️ Следующий элемент',
    category: 'Массив',
    description: 'Получает следующий элемент массива.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/arrays/get_next').evaluate,
    pins: {
      inputs: [
        { id: 'array', name: 'Массив', type: 'Array', required: true },
        { id: 'current_index', name: 'Текущий индекс', type: 'Number', required: true }
      ],
      outputs: [
        { id: 'next_element', name: 'Следующий элемент', type: 'Any' },
        { id: 'next_index', name: 'Следующий индекс', type: 'Number' },
        { id: 'has_next', name: 'Есть следующий?', type: 'Boolean', description: 'True, если следующий элемент существует' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'array:add_element',
    label: '➕ Добавить элемент',
    category: 'Массив',
    description: 'Добавляет элемент в конец массива.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/arrays/add_element').evaluate,
    pins: {
      inputs: [
        { id: 'array', name: 'Массив', type: 'Array', required: true },
        { id: 'element', name: 'Элемент', type: 'Wildcard', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Новый массив', type: 'Array' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'array:remove_by_index',
    label: '➖ Удалить по индексу',
    category: 'Массив',
    description: 'Удаляет элемент из массива по его индексу.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/arrays/remove_by_index').evaluate,
    pins: {
      inputs: [
        { id: 'array', name: 'Массив', type: 'Array', required: true },
        { id: 'index', name: 'Индекс', type: 'Number', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Новый массив', type: 'Array' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'array:find_index',
    label: '🔍 Найти индекс',
    category: 'Массив',
    description: 'Находит индекс элемента в массиве (или -1 если не найден).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/arrays/find_index').evaluate,
    pins: {
      inputs: [
        { id: 'array', name: 'Массив', type: 'Array', required: true },
        { id: 'element', name: 'Элемент', type: 'Wildcard', required: true }
      ],
      outputs: [
        { id: 'index', name: 'Индекс', type: 'Number' }
      ]
    }
  });
}

module.exports = { registerNodes };
