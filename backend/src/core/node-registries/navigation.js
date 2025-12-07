const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Навигация"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'navigation:go_to',
    label: '🚶 Идти к',
    category: 'Навигация',
    description: 'Перемещает бота к указанным координатам используя pathfinding.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/navigation/go_to').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'x', name: 'X', type: 'Number', required: false },
        { id: 'y', name: 'Y', type: 'Number', required: false },
        { id: 'z', name: 'Z', type: 'Number', required: false },
        { id: 'range', name: 'Радиус', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Дошёл', type: 'Exec' },
        { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'navigation:go_to_player',
    label: '🏃 Идти к игроку',
    category: 'Навигация',
    description: 'Перемещает бота к указанному игроку.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/navigation/go_to_player').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'playerName', name: 'Имя игрока', type: 'String', required: true },
        { id: 'range', name: 'Радиус', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Дошёл', type: 'Exec' },
        { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
        { id: 'success', name: 'Успех?', type: 'Boolean' },
        { id: 'playerPosition', name: 'Позиция игрока', type: 'Object' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'navigation:go_to_entity',
    label: '🎯 Идти к сущности',
    category: 'Навигация',
    description: 'Перемещает бота к указанной сущности.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/navigation/go_to_entity').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'entity', name: 'Сущность', type: 'Object', required: true },
        { id: 'range', name: 'Радиус', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Дошёл', type: 'Exec' },
        { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
        { id: 'success', name: 'Успех?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'navigation:follow',
    label: '👥 Следовать',
    category: 'Навигация',
    description: 'Начинает следовать за игроком.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/navigation/follow').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'target', name: 'Цель', type: 'String', required: true },
        { id: 'range', name: 'Дистанция', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Начал следовать', type: 'Exec' },
        { id: 'following', name: 'Следует?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'navigation:stop',
    label: '🛑 Остановиться',
    category: 'Навигация',
    description: 'Останавливает текущее движение бота.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/navigation/stop').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' }
      ]
    }
  });
}

module.exports = { registerNodes };
