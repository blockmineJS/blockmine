const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Печка"
 */
function registerNodes(registry) {
  console.log('[Furnace Registry] Registering furnace nodes...');

  // ACTION NODES (с exec пинами) - используют executor

  registry.registerNodeType({
    type: 'furnace:open',
    label: '🔥 Печка: открыть',
    category: 'Печка',
    description: 'Открывает печку (обычную, плавильную, коптильню) по координатам.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/furnace/open').execute,
    evaluator: require('../nodes/furnace/open').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'x', name: 'X', type: 'Number', required: false },
        { id: 'y', name: 'Y', type: 'Number', required: false },
        { id: 'z', name: 'Z', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Открыта', type: 'Exec' },
        { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
        { id: 'furnace', name: 'Печка', type: 'Object' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'furnace:close',
    label: '🔥 Печка: закрыть',
    category: 'Печка',
    description: 'Закрывает открытую печку.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/furnace/close').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' }
      ],
      outputs: [
        { id: 'exec', name: 'Далее', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'furnace:put_input',
    label: '🔥 Печка: положить для плавки',
    category: 'Печка',
    description: 'Кладёт предмет в слот плавки печки.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/furnace/put_input').execute,
    evaluator: require('../nodes/furnace/put_input').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'itemName', name: 'Предмет', type: 'String', required: true },
        { id: 'count', name: 'Кол-во', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Положено', type: 'Exec' },
        { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'furnace:put_fuel',
    label: '🔥 Печка: положить топливо',
    category: 'Печка',
    description: 'Кладёт топливо в слот топлива печки.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/furnace/put_fuel').execute,
    evaluator: require('../nodes/furnace/put_fuel').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'itemName', name: 'Топливо', type: 'String', required: true },
        { id: 'count', name: 'Кол-во', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Положено', type: 'Exec' },
        { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'furnace:take_output',
    label: '🔥 Печка: забрать результат',
    category: 'Печка',
    description: 'Забирает готовый предмет из слота результата печки.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/furnace/take_output').execute,
    evaluator: require('../nodes/furnace/take_output').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' }
      ],
      outputs: [
        { id: 'exec', name: 'Забрано', type: 'Exec' },
        { id: 'exec_failed', name: 'Пусто/Ошибка', type: 'Exec' },
        { id: 'item', name: 'Предмет', type: 'Object' },
        { id: 'count', name: 'Кол-во', type: 'Number' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  // DATA NODE (без exec пинов) - использует только evaluator

  registry.registerNodeType({
    type: 'furnace:get_status',
    label: '🔥 Печка: статус',
    category: 'Печка',
    description: 'Получает текущий статус печки (топливо, прогресс, предметы).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/furnace/get_status').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'inputItem', name: 'Плавится', type: 'Object' },
        { id: 'fuelItem', name: 'Топливо', type: 'Object' },
        { id: 'outputItem', name: 'Результат', type: 'Object' },
        { id: 'fuel', name: 'Топливо %', type: 'Number' },
        { id: 'progress', name: 'Прогресс %', type: 'Number' },
        { id: 'isBurning', name: 'Горит?', type: 'Boolean' }
      ]
    }
  });

  console.log('[Furnace Registry] Furnace nodes registered successfully');
}

module.exports = { registerNodes };
