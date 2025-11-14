const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Объекты"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'object:create',
    label: '🏗️ Создать объект',
    category: 'Объект',
    description: 'Создает объект из пар ключ-значение.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../nodes/objects/create').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'object', name: 'Объект', type: 'Object' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'object:get',
    label: '📤 Получить значение',
    category: 'Объект',
    description: 'Получает значение по ключу из объекта.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/objects/get').evaluate,
    pins: {
      inputs: [
        { id: 'object', name: 'Объект', type: 'Object', required: true },
        { id: 'key', name: 'Ключ', type: 'String', required: true }
      ],
      outputs: [
        { id: 'value', name: 'Значение', type: 'Any' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'object:set',
    label: '➕ Добавить/Изменить ключ',
    category: 'Объект',
    description: 'Добавляет или изменяет значение по ключу в объекте.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/objects/set').evaluate,
    pins: {
      inputs: [
        { id: 'object', name: 'Объект', type: 'Object', required: true },
        { id: 'key', name: 'Ключ', type: 'String', required: true },
        { id: 'value', name: 'Значение', type: 'Any', required: true }
      ],
      outputs: [
        { id: 'new_object', name: 'Новый объект', type: 'Object' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'object:delete',
    label: '➖ Удалить ключ',
    category: 'Объект',
    description: 'Удаляет ключ из объекта.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/objects/delete').evaluate,
    pins: {
      inputs: [
        { id: 'object', name: 'Объект', type: 'Object', required: true },
        { id: 'key', name: 'Ключ', type: 'String', required: true }
      ],
      outputs: [
        { id: 'new_object', name: 'Новый объект', type: 'Object' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'object:has_key',
    label: '🔍 Проверить ключ',
    category: 'Объект',
    description: 'Проверяет наличие ключа в объекте и возвращает значение.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/objects/has_key').evaluate,
    pins: {
      inputs: [
        { id: 'object', name: 'Объект', type: 'Object', required: true },
        { id: 'key', name: 'Ключ', type: 'String', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Найден', type: 'Boolean' },
        { id: 'value', name: 'Значение', type: 'Any' }
      ]
    }
  });
}

module.exports = { registerNodes };
