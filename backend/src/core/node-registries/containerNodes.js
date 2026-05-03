const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const containerNodes = [
  {
    type: 'container:open',
    label: '📦 Контейнер: открыть',
    category: 'Контейнеры',
    description: 'Открывает контейнер (сундук, бочку) по координатам.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/container/open').execute,
    evaluator: require('../../core/nodes/container/open').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'x', name: 'X', type: 'Number', required: false, inlineField: true, placeholder: '0' },
      { id: 'y', name: 'Y', type: 'Number', required: false, inlineField: true, placeholder: '64' },
      { id: 'z', name: 'Z', type: 'Number', required: false, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Открыт', type: 'Exec' },
      { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
      { id: 'container', name: 'Контейнер', type: 'Object' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { x: 0, y: 64, z: 0 },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'container:close',
    label: '📦 Контейнер: закрыть',
    category: 'Контейнеры',
    description: 'Закрывает текущий открытый контейнер.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/container/close').execute,
    computeInputs: () => [{ id: 'exec', name: 'Выполнить', type: 'Exec' }],
    computeOutputs: () => [{ id: 'exec', name: 'Закрыт', type: 'Exec' }],
    defaultData: {},
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'container:deposit',
    label: '📦 Контейнер: положить',
    category: 'Контейнеры',
    description: 'Кладёт предмет из инвентаря в открытый контейнер.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/container/deposit').execute,
    evaluator: require('../../core/nodes/container/deposit').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'itemName', name: 'Предмет', type: 'String', required: true, inlineField: true, placeholder: 'diamond...' },
      { id: 'count', name: 'Кол-во', type: 'Number', required: false, inlineField: true, placeholder: 'Все' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Готово', type: 'Exec' },
      { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
      { id: 'deposited', name: 'Положено', type: 'Number' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { itemName: '', count: null },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'container:withdraw',
    label: '📦 Контейнер: забрать',
    category: 'Контейнеры',
    description: 'Забирает предмет из контейнера в инвентарь.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/container/withdraw').execute,
    evaluator: require('../../core/nodes/container/withdraw').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'itemName', name: 'Предмет', type: 'String', required: true, inlineField: true, placeholder: 'diamond...' },
      { id: 'count', name: 'Кол-во', type: 'Number', required: false, inlineField: true, placeholder: 'Все' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Готово', type: 'Exec' },
      { id: 'exec_failed', name: 'Ошибка', type: 'Exec' },
      { id: 'withdrawn', name: 'Забрано', type: 'Number' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { itemName: '', count: null },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'container:deposit_all',
    label: '📦 Контейнер: положить всё',
    category: 'Контейнеры',
    description: 'Кладёт все предметы (или определённого типа) в контейнер.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/container/deposit_all').execute,
    evaluator: require('../../core/nodes/container/deposit_all').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'itemName', name: 'Предмет', type: 'String', required: false, inlineField: true, placeholder: 'Все' },
      { id: 'keepOne', name: 'Оставить 1', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Готово', type: 'Exec' },
      { id: 'deposited', name: 'Положено', type: 'Number' }
    ],
    defaultData: { itemName: '', keepOne: false },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'container:get_items',
    label: '📦 Контейнер: содержимое',
    category: 'Контейнеры',
    description: 'Получает список предметов из открытого контейнера.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/container/get_items').evaluate,
    computeInputs: (data) => [
      { id: 'container', name: 'Контейнер', type: 'Object', required: false }
    ],
    computeOutputs: (data) => [
      { id: 'items', name: 'Предметы', type: 'Array' },
      { id: 'count', name: 'Кол-во слотов', type: 'Number' }
    ],
    defaultData: {},
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'container:find_item',
    label: '📦 Контейнер: найти предмет',
    category: 'Контейнеры',
    description: 'Ищет предмет в открытом контейнере.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/container/find_item').evaluate,
    computeInputs: (data) => [
      { id: 'itemName', name: 'Предмет', type: 'String', required: true, inlineField: true, placeholder: 'diamond...' }
    ],
    computeOutputs: (data) => [
      { id: 'item', name: 'Предмет', type: 'Object' },
      { id: 'slot', name: 'Слот', type: 'Number' },
      { id: 'count', name: 'Кол-во', type: 'Number' },
      { id: 'found', name: 'Найден?', type: 'Boolean' }
    ],
    defaultData: { itemName: '' },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  }
];

module.exports = containerNodes;