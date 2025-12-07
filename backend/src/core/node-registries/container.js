const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Контейнеры"
 */
function registerNodes(registry) {
  console.log('[Container Registry] Registering container nodes...');

  // ACTION NODES (с exec пинами) - используют executor

  registry.registerNodeType({
    type: 'container:open',
    label: '📦 Контейнер: открыть',
    category: 'Контейнеры',
    description: 'Открывает контейнер (сундук, бочку) по координатам.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/container/open').execute,
    evaluator: require('../nodes/container/open').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'x', name: 'X', type: 'Number', required: false },
        { id: 'y', name: 'Y', type: 'Number', required: false },
        { id: 'z', name: 'Z', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Открыт', type: 'Exec' },
        { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
        { id: 'container', name: 'Контейнер', type: 'Object' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'container:close',
    label: '📦 Контейнер: закрыть',
    category: 'Контейнеры',
    description: 'Закрывает текущий открытый контейнер.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/container/close').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' }
      ],
      outputs: [
        { id: 'exec', name: 'Закрыт', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'container:deposit',
    label: '📦 Контейнер: положить',
    category: 'Контейнеры',
    description: 'Кладёт предмет из инвентаря в открытый контейнер.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/container/deposit').execute,
    evaluator: require('../nodes/container/deposit').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'itemName', name: 'Предмет', type: 'String', required: true },
        { id: 'count', name: 'Кол-во', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Готово', type: 'Exec' },
        { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
        { id: 'deposited', name: 'Положено', type: 'Number' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'container:withdraw',
    label: '📦 Контейнер: забрать',
    category: 'Контейнеры',
    description: 'Забирает предмет из контейнера в инвентарь.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/container/withdraw').execute,
    evaluator: require('../nodes/container/withdraw').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'itemName', name: 'Предмет', type: 'String', required: true },
        { id: 'count', name: 'Кол-во', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Готово', type: 'Exec' },
        { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
        { id: 'withdrawn', name: 'Забрано', type: 'Number' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'container:deposit_all',
    label: '📦 Контейнер: положить всё',
    category: 'Контейнеры',
    description: 'Кладёт все предметы (или определённого типа) в контейнер.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/container/deposit_all').execute,
    evaluator: require('../nodes/container/deposit_all').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'itemName', name: 'Предмет', type: 'String', required: false },
        { id: 'keepOne', name: 'Оставить 1', type: 'Boolean', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Готово', type: 'Exec' },
        { id: 'deposited', name: 'Положено', type: 'Number' }
      ]
    }
  });

  // DATA NODES (без exec пинов) - используют только evaluator

  registry.registerNodeType({
    type: 'container:get_items',
    label: '📦 Контейнер: содержимое',
    category: 'Контейнеры',
    description: 'Получает список предметов из открытого контейнера.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/container/get_items').evaluate,
    pins: {
      inputs: [
        { id: 'container', name: 'Контейнер', type: 'Object', required: false }
      ],
      outputs: [
        { id: 'items', name: 'Предметы', type: 'Array' },
        { id: 'count', name: 'Кол-во слотов', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'container:find_item',
    label: '📦 Контейнер: найти предмет',
    category: 'Контейнеры',
    description: 'Ищет предмет в открытом контейнере.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/container/find_item').evaluate,
    pins: {
      inputs: [
        { id: 'itemName', name: 'Предмет', type: 'String', required: true }
      ],
      outputs: [
        { id: 'item', name: 'Предмет', type: 'Object' },
        { id: 'slot', name: 'Слот', type: 'Number' },
        { id: 'count', name: 'Кол-во', type: 'Number' },
        { id: 'found', name: 'Найден?', type: 'Boolean' }
      ]
    }
  });

  console.log('[Container Registry] Container nodes registered successfully');
}

module.exports = { registerNodes };
