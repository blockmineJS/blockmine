const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const furnaceNodes = [
  {
    type: 'furnace:open',
    label: '🔥 Печка: открыть',
    category: 'Печка',
    description: 'Открывает печку (обычную, плавильную, коптильню) по координатам.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/furnace/open').execute,
    evaluator: require('../../core/nodes/furnace/open').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'x', name: 'X', type: 'Number', required: false, inlineField: true, placeholder: '0' },
      { id: 'y', name: 'Y', type: 'Number', required: false, inlineField: true, placeholder: '64' },
      { id: 'z', name: 'Z', type: 'Number', required: false, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Открыта', type: 'Exec' },
      { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
      { id: 'furnace', name: 'Печка', type: 'Object' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { x: 0, y: 64, z: 0 },
    theme: { headerColor: '#ef4444', accentColor: '#f87171' }
  },
  {
    type: 'furnace:close',
    label: '🔥 Печка: закрыть',
    category: 'Печка',
    description: 'Закрывает открытую печку.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/furnace/close').execute,
    computeInputs: () => [{ id: 'exec', name: 'Выполнить', type: 'Exec' }],
    computeOutputs: () => [{ id: 'exec', name: 'Далее', type: 'Exec' }],
    defaultData: {},
    theme: { headerColor: '#ef4444', accentColor: '#f87171' }
  },
  {
    type: 'furnace:put_input',
    label: '🔥 Печка: положить для плавки',
    category: 'Печка',
    description: 'Кладёт предмет в слот плавки печки.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/furnace/put_input').execute,
    evaluator: require('../../core/nodes/furnace/put_input').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'itemName', name: 'Предмет', type: 'String', required: true, inlineField: true, placeholder: 'iron_ore...' },
      { id: 'count', name: 'Кол-во', type: 'Number', required: false, inlineField: true, placeholder: 'Все' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Положено', type: 'Exec' },
      { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { itemName: '', count: null },
    theme: { headerColor: '#ef4444', accentColor: '#f87171' }
  },
  {
    type: 'furnace:put_fuel',
    label: '🔥 Печка: положить топливо',
    category: 'Печка',
    description: 'Кладёт топливо в слот топлива печки.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/furnace/put_fuel').execute,
    evaluator: require('../../core/nodes/furnace/put_fuel').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'itemName', name: 'Топливо', type: 'String', required: true, inlineField: true, placeholder: 'coal...' },
      { id: 'count', name: 'Кол-во', type: 'Number', required: false, inlineField: true, placeholder: 'Все' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Положено', type: 'Exec' },
      { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { itemName: '', count: null },
    theme: { headerColor: '#ef4444', accentColor: '#f87171' }
  },
  {
    type: 'furnace:take_output',
    label: '🔥 Печка: забрать результат',
    category: 'Печка',
    description: 'Забирает готовый предмет из слота результата печки.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/furnace/take_output').execute,
    evaluator: require('../../core/nodes/furnace/take_output').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Забрано', type: 'Exec' },
      { id: 'exec_failed', name: 'Пусто/Ошибка', type: 'Exec' },
      { id: 'item', name: 'Предмет', type: 'Object' },
      { id: 'count', name: 'Кол-во', type: 'Number' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: {},
    theme: { headerColor: '#ef4444', accentColor: '#f87171' }
  },
  {
    type: 'furnace:get_status',
    label: '🔥 Печка: статус',
    category: 'Печка',
    description: 'Получает текущий статус печки (топливо, прогресс, предметы).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/furnace/get_status').evaluate,
    computeInputs: () => [],
    computeOutputs: () => [
      { id: 'inputItem', name: 'Плавится', type: 'Object' },
      { id: 'fuelItem', name: 'Топливо', type: 'Object' },
      { id: 'outputItem', name: 'Результат', type: 'Object' },
      { id: 'fuel', name: 'Топливо %', type: 'Number' },
      { id: 'progress', name: 'Прогресс %', type: 'Number' },
      { id: 'isBurning', name: 'Горит?', type: 'Boolean' }
    ],
    defaultData: {},
    theme: { headerColor: '#ef4444', accentColor: '#f87171' }
  }
];

module.exports = furnaceNodes;