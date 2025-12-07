const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Инвентарь"
 */
function registerNodes(registry) {
  // ========== DATA NODES ==========

  registry.registerNodeType({
    type: 'inventory:get_all',
    label: '📦 Весь инвентарь',
    category: 'Инвентарь',
    description: 'Возвращает весь инвентарь бота как массив предметов.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/get_all').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'items', name: 'Предметы', type: 'Array' },
        { id: 'count', name: 'Кол-во слотов', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'inventory:find_item',
    label: '🔍 Найти предмет',
    category: 'Инвентарь',
    description: 'Ищет предмет в инвентаре по имени.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/find_item').evaluate,
    pins: {
      inputs: [
        { id: 'itemName', name: 'Имя предмета', type: 'String', required: true }
      ],
      outputs: [
        { id: 'item', name: 'Предмет', type: 'Object' },
        { id: 'found', name: 'Найден?', type: 'Boolean' },
        { id: 'slot', name: 'Слот', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'inventory:count_item',
    label: '🔢 Подсчитать предмет',
    category: 'Инвентарь',
    description: 'Подсчитывает общее количество предмета в инвентаре.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/count_item').evaluate,
    pins: {
      inputs: [
        { id: 'itemName', name: 'Имя предмета', type: 'String', required: true }
      ],
      outputs: [
        { id: 'count', name: 'Количество', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'inventory:has_item',
    label: '❓ Есть предмет?',
    category: 'Инвентарь',
    description: 'Проверяет наличие предмета в инвентаре.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/has_item').evaluate,
    pins: {
      inputs: [
        { id: 'itemName', name: 'Имя предмета', type: 'String', required: true },
        { id: 'minCount', name: 'Мин. кол-во', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'hasItem', name: 'Есть?', type: 'Boolean' },
        { id: 'actualCount', name: 'Фактически', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'inventory:get_slot',
    label: '🎰 Получить слот',
    category: 'Инвентарь',
    description: 'Получает предмет в указанном слоте инвентаря.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/get_slot').evaluate,
    pins: {
      inputs: [
        { id: 'slotNumber', name: 'Номер слота', type: 'Number', required: true }
      ],
      outputs: [
        { id: 'item', name: 'Предмет', type: 'Object' },
        { id: 'isEmpty', name: 'Пусто?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'inventory:get_held_item',
    label: '✋ Предмет в руке',
    category: 'Инвентарь',
    description: 'Получает предмет который бот держит в руке.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/get_held_item').evaluate,
    pins: {
      inputs: [
        { id: 'hand', name: 'Рука', type: 'String', required: false }
      ],
      outputs: [
        { id: 'item', name: 'Предмет', type: 'Object' },
        { id: 'name', name: 'Имя', type: 'String' },
        { id: 'count', name: 'Количество', type: 'Number' },
        { id: 'hasItem', name: 'Есть предмет?', type: 'Boolean' }
      ]
    }
  });

  // ========== ACTION NODES ==========

  registry.registerNodeType({
    type: 'inventory:equip',
    label: '⚔️ Экипировать',
    category: 'Инвентарь',
    description: 'Экипирует предмет в руку или слот брони.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/equip').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'itemName', name: 'Предмет', type: 'String', required: true },
        { id: 'destination', name: 'Куда', type: 'String', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'inventory:drop',
    label: '🗑️ Выбросить',
    category: 'Инвентарь',
    description: 'Выбрасывает предмет из инвентаря.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/drop').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'itemName', name: 'Предмет', type: 'String', required: true },
        { id: 'count', name: 'Количество', type: 'Number', required: false },
        { id: 'dropAll', name: 'Выбросить все?', type: 'Boolean', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' },
        { id: 'dropped', name: 'Выброшено', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'inventory:select_slot',
    label: '🎯 Выбрать слот',
    category: 'Инвентарь',
    description: 'Выбирает слот хотбара (0-8).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/inventory/select_slot').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'slot', name: 'Слот', type: 'Number', required: true }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' },
        { id: 'item', name: 'Предмет', type: 'Object' }
      ]
    }
  });
}

module.exports = { registerNodes };
