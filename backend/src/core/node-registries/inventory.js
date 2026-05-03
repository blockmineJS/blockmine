const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

function registerNodes(registry) {
  registry.registerNodeType({
    type: 'inventory:get_all',
    label: '📦 Весь инвентарь',
    category: 'Инвентарь',
    description: 'Возвращает весь инвентарь бота как массив предметов.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/inventory/get_all').evaluate,
    computeInputs: () => [],
    computeOutputs: () => [
      { id: 'items', name: 'Предметы', type: 'Array' },
      { id: 'count', name: 'Кол-во слотов', type: 'Number' }
    ],
    defaultData: {},
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });

  registry.registerNodeType({
    type: 'inventory:find_item',
    label: '🔍 Найти предмет',
    category: 'Инвентарь',
    description: 'Ищет предмет в инвентаре по имени.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/inventory/find_item').evaluate,
    computeInputs: (data) => [
      { id: 'itemName', name: 'Имя предмета', type: 'String', required: true, inlineField: true, placeholder: 'diamond...' }
    ],
    computeOutputs: () => [
      { id: 'item', name: 'Предмет', type: 'Object' },
      { id: 'found', name: 'Найден?', type: 'Boolean' },
      { id: 'slot', name: 'Слот', type: 'Number' }
    ],
    defaultData: { itemName: '' },
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });

  registry.registerNodeType({
    type: 'inventory:count_item',
    label: '🔢 Подсчитать предмет',
    category: 'Инвентарь',
    description: 'Подсчитывает общее количество предмета в инвентаре.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/inventory/count_item').evaluate,
    computeInputs: (data) => [
      { id: 'itemName', name: 'Имя предмета', type: 'String', required: true, inlineField: true, placeholder: 'diamond...' }
    ],
    computeOutputs: () => [
      { id: 'count', name: 'Количество', type: 'Number' }
    ],
    defaultData: { itemName: '' },
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });

  registry.registerNodeType({
    type: 'inventory:has_item',
    label: '❓ Есть предмет?',
    category: 'Инвентарь',
    description: 'Проверяет наличие предмета в инвентаре.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/inventory/has_item').evaluate,
    computeInputs: (data) => [
      { id: 'itemName', name: 'Имя предмета', type: 'String', required: true, inlineField: true, placeholder: 'diamond...' },
      { id: 'minCount', name: 'Мин. кол-во', type: 'Number', required: false, inlineField: true, placeholder: '1' }
    ],
    computeOutputs: () => [
      { id: 'hasItem', name: 'Есть?', type: 'Boolean' },
      { id: 'actualCount', name: 'Фактически', type: 'Number' }
    ],
    defaultData: { itemName: '', minCount: 1 },
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });

  registry.registerNodeType({
    type: 'inventory:get_slot',
    label: '🎰 Получить слот',
    category: 'Инвентарь',
    description: 'Получает предмет в указанном слоте инвентаря.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/inventory/get_slot').evaluate,
    computeInputs: (data) => [
      { id: 'slotNumber', name: 'Номер слота', type: 'Number', required: true, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: () => [
      { id: 'item', name: 'Предмет', type: 'Object' },
      { id: 'isEmpty', name: 'Пусто?', type: 'Boolean' }
    ],
    defaultData: { slotNumber: 0 },
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });

  registry.registerNodeType({
    type: 'inventory:get_held_item',
    label: '✋ Предмет в руке',
    category: 'Инвентарь',
    description: 'Получает предмет который бот держит в руке.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/inventory/get_held_item').evaluate,
    computeInputs: (data) => [
      { id: 'hand', name: 'Рука', type: 'String', required: false, inlineField: true, placeholder: 'mainhand' }
    ],
    computeOutputs: () => [
      { id: 'item', name: 'Предмет', type: 'Object' },
      { id: 'name', name: 'Имя', type: 'String' },
      { id: 'count', name: 'Количество', type: 'Number' },
      { id: 'hasItem', name: 'Есть предмет?', type: 'Boolean' }
    ],
    defaultData: { hand: 'mainhand' },
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });

  registry.registerNodeType({
    type: 'inventory:equip',
    label: '⚔️ Экипировать',
    category: 'Инвентарь',
    description: 'Экипирует предмет в руку или слот брони.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/inventory/equip').execute,
    evaluator: require('../../core/nodes/inventory/equip').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'itemName', name: 'Предмет', type: 'String', required: true, inlineField: true, placeholder: 'diamond_sword...' },
      { id: 'destination', name: 'Куда', type: 'String', required: false, inlineField: true, placeholder: 'hand' }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' },
      { id: 'success', name: 'Успех?', type: 'Boolean' }
    ],
    defaultData: { itemName: '', destination: 'hand' },
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });

  registry.registerNodeType({
    type: 'inventory:drop',
    label: '🗑️ Выбросить',
    category: 'Инвентарь',
    description: 'Выбрасывает предмет из инвентаря.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/inventory/drop').execute,
    evaluator: require('../../core/nodes/inventory/drop').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'itemName', name: 'Предмет', type: 'String', required: true, inlineField: true, placeholder: 'dirt...' },
      { id: 'count', name: 'Количество', type: 'Number', required: false, inlineField: true, placeholder: 'все' },
      { id: 'dropAll', name: 'Выбросить все?', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' },
      { id: 'dropped', name: 'Выброшено', type: 'Number' }
    ],
    defaultData: { itemName: '', count: null, dropAll: false },
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });

  registry.registerNodeType({
    type: 'inventory:select_slot',
    label: '🎯 Выбрать слот',
    category: 'Инвентарь',
    description: 'Выбирает слот хотбара (0-8).',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/inventory/select_slot').execute,
    evaluator: require('../../core/nodes/inventory/select_slot').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'slot', name: 'Слот', type: 'Number', required: true, inlineField: true, placeholder: '0-8' }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' },
      { id: 'item', name: 'Предмет', type: 'Object' }
    ],
    defaultData: { slot: 0 },
    theme: { headerColor: '#f59e0b', accentColor: '#fbbf24' }
  });
}

module.exports = { registerNodes };