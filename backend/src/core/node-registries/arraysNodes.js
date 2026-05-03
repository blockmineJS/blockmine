const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const arraysNodes = [
  {
    type: 'array:get_random_element',
    label: '🎲 Случайный элемент',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Возвращает случайный элемент из массива и его индекс.',
    evaluator: require('../../core/nodes/arrays/get_random_element').evaluate,
    computeInputs: () => [
      { id: 'array', name: 'Массив', type: 'Array', required: true }
    ],
    computeOutputs: () => [
      { id: 'element', name: 'Элемент', type: 'Any' },
      { id: 'index', name: 'Индекс', type: 'Number' }
    ],
    defaultData: {}
  },
  {
    type: 'array:contains',
    label: '🔍 Массив: Содержит',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Проверяет, содержит ли массив указанный элемент и возвращает его индекс.',
    evaluator: require('../../core/nodes/arrays/contains').evaluate,
    computeInputs: () => [
      { id: 'array', name: 'Массив', type: 'Array', required: true },
      { id: 'element', name: 'Элемент', type: 'Wildcard', required: true, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Найден', type: 'Boolean' },
      { id: 'index', name: 'Индекс', type: 'Number' }
    ],
    defaultData: { element: null }
  },
  {
    type: 'array:get_by_index',
    label: '📦 Элемент по индексу',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Получает элемент массива по его индексу.',
    evaluator: require('../../core/nodes/arrays/get_by_index').evaluate,
    computeInputs: (data) => [
      { id: 'array', name: 'Массив', type: 'Array', required: true },
      { id: 'index', name: 'Индекс', type: 'Number', required: true, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: () => [
      { id: 'element', name: 'Элемент', type: 'Any' }
    ],
    defaultData: { index: 0 }
  },
  {
    type: 'array:get_next',
    label: '➡️ Следующий элемент',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Получает следующий элемент массива.',
    evaluator: require('../../core/nodes/arrays/get_next').evaluate,
    computeInputs: (data) => [
      { id: 'array', name: 'Массив', type: 'Array', required: true },
      { id: 'current_index', name: 'Текущий индекс', type: 'Number', required: true, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: () => [
      { id: 'next_element', name: 'Следующий элемент', type: 'Any' },
      { id: 'next_index', name: 'Следующий индекс', type: 'Number' },
      { id: 'has_next', name: 'Есть следующий?', type: 'Boolean' }
    ],
    defaultData: { current_index: 0 }
  },
  {
    type: 'array:add_element',
    label: '➕ Добавить элемент',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Добавляет элемент в конец массива.',
    evaluator: require('../../core/nodes/arrays/add_element').evaluate,
    computeInputs: () => [
      { id: 'array', name: 'Массив', type: 'Array', required: true },
      { id: 'element', name: 'Элемент', type: 'Wildcard', required: true, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Новый массив', type: 'Array' }
    ],
    defaultData: { element: null }
  },
  {
    type: 'array:remove_by_index',
    label: '➖ Удалить по индексу',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Удаляет элемент из массива по его индексу.',
    evaluator: require('../../core/nodes/arrays/remove_by_index').evaluate,
    computeInputs: (data) => [
      { id: 'array', name: 'Массив', type: 'Array', required: true },
      { id: 'index', name: 'Индекс', type: 'Number', required: true, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Новый массив', type: 'Array' }
    ],
    defaultData: { index: 0 }
  },
  {
    type: 'array:find_index',
    label: '🔍 Найти индекс',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Находит индекс элемента в массиве (или -1 если не найден).',
    evaluator: require('../../core/nodes/arrays/find_index').evaluate,
    computeInputs: () => [
      { id: 'array', name: 'Массив', type: 'Array', required: true },
      { id: 'element', name: 'Элемент', type: 'Wildcard', required: true, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'index', name: 'Индекс', type: 'Number' }
    ],
    defaultData: { element: null }
  },
  {
    type: 'array:join',
    label: '🔗 Объединить в строку',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Объединяет элементы массива в строку с разделителем.',
    evaluator: require('../../core/nodes/arrays/join').evaluate,
    computeInputs: (data) => [
      { id: 'array', name: 'Массив', type: 'Array', required: false },
      { id: 'separator', name: 'Разделитель', type: 'String', required: false, inlineField: true, placeholder: ',' }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Result', type: 'String' }
    ],
    defaultData: { separator: ',' }
  }
];

module.exports = arraysNodes;