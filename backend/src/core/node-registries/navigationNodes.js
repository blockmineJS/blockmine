const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const navigationNodes = [
  {
    type: 'navigation:go_to',
    label: '🚶 Идти к координатам',
    category: 'Навигация',
    description: 'Перемещает бота к указанным координатам используя pathfinding.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/navigation/go_to').execute,
    evaluator: require('../../core/nodes/navigation/go_to').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'x', name: 'X', type: 'Number', required: false, inlineField: true, placeholder: '0' },
      { id: 'y', name: 'Y', type: 'Number', required: false, inlineField: true, placeholder: '64' },
      { id: 'z', name: 'Z', type: 'Number', required: false, inlineField: true, placeholder: '0' },
      { id: 'range', name: 'Радиус', type: 'Number', required: false, inlineField: true, placeholder: '1' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Дошёл', type: 'Exec' },
      { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { x: 0, y: 64, z: 0, range: 1 },
    theme: { headerColor: '#3b82f6', accentColor: '#60a5fa' }
  },
  {
    type: 'navigation:go_to_player',
    label: '🏃 Идти к игроку',
    category: 'Навигация',
    description: 'Перемещает бота к указанному игроку.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/navigation/go_to_player').execute,
    evaluator: require('../../core/nodes/navigation/go_to_player').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'playerName', name: 'Имя игрока', type: 'String', required: true, inlineField: true, placeholder: 'Steve' },
      { id: 'range', name: 'Радиус', type: 'Number', required: false, inlineField: true, placeholder: '3' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Дошёл', type: 'Exec' },
      { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
      { id: 'success', name: 'Успех?', type: 'Boolean' },
      { id: 'playerPosition', name: 'Позиция игрока', type: 'Object' }
    ],
    defaultData: { playerName: '', range: 3 },
    theme: { headerColor: '#3b82f6', accentColor: '#60a5fa' }
  },
  {
    type: 'navigation:go_to_entity',
    label: '🎯 Идти к сущности',
    category: 'Навигация',
    description: 'Перемещает бота к указанной сущности.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/navigation/go_to_entity').execute,
    evaluator: require('../../core/nodes/navigation/go_to_entity').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'entity', name: 'Сущность', type: 'Object', required: true, inlineField: false },
      { id: 'range', name: 'Радиус', type: 'Number', required: false, inlineField: true, placeholder: '3' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Дошёл', type: 'Exec' },
      { id: 'exec_failed', name: 'Не удалось', type: 'Exec' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { range: 3 },
    theme: { headerColor: '#3b82f6', accentColor: '#60a5fa' }
  },
  {
    type: 'navigation:follow',
    label: '👥 Следовать за игроком',
    category: 'Навигация',
    description: 'Начинает следовать за игроком.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/navigation/follow').execute,
    evaluator: require('../../core/nodes/navigation/follow').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'target', name: 'Цель', type: 'String', required: true, inlineField: true, placeholder: 'Steve' },
      { id: 'range', name: 'Дистанция', type: 'Number', required: false, inlineField: true, placeholder: '5' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Начал следовать', type: 'Exec' },
      { id: 'following', name: 'Следует?', type: 'Boolean' }
    ],
    defaultData: { target: '', range: 5 },
    theme: { headerColor: '#3b82f6', accentColor: '#60a5fa' }
  },
  {
    type: 'navigation:stop',
    label: '🛑 Остановиться',
    category: 'Навигация',
    description: 'Останавливает текущее движение бота.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/navigation/stop').execute,
    evaluator: require('../../core/nodes/navigation/stop').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#3b82f6', accentColor: '#60a5fa' }
  }
];

module.exports = navigationNodes;