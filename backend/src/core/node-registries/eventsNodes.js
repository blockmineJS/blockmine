const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const eventsNodes = [
  {
    type: 'event:command',
    label: '▶️ При выполнении команды',
    category: 'События',
    description: 'Стартовая точка для графа команды.',
    graphType: GRAPH_TYPES.ALL,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'command_name', name: 'Имя команды', type: 'String' },
      { id: 'user', name: 'Пользователь', type: 'User' },
      { id: 'args', name: 'Аргументы', type: 'Object' },
      { id: 'chat_type', name: 'Тип чата', type: 'String' },
      { id: 'success', name: 'Успешно', type: 'Boolean', description: 'Возвращает true, если команда не попала на ошибку' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:chat',
    label: '💬 Сообщение в чате',
    category: 'События',
    description: 'Срабатывает, когда в чат приходит сообщение.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'username', name: 'Игрок', type: 'String' },
      { id: 'message', name: 'Сообщение', type: 'String' },
      { id: 'chatType', name: 'Тип чата', type: 'String' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:raw_message',
    label: '📝 Сырое сообщение',
    category: 'События',
    description: 'Срабатывает при получении любого сообщения в сыром виде.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'rawText', name: 'Сырой текст', type: 'String' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:playerJoined',
    label: '👋 Игрок зашел',
    category: 'События',
    description: 'Срабатывает, когда игрок заходит на сервер.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'user', name: 'Пользователь', type: 'User' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:playerLeft',
    label: '🚪 Игрок вышел',
    category: 'События',
    description: 'Срабатывает, когда игрок покидает сервер.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'user', name: 'Пользователь', type: 'User' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:entitySpawn',
    label: '📦 Сущность появилась',
    category: 'События',
    description: 'Вызывается, когда новая сущность появляется в поле зрения бота.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'entity', name: 'Сущность', type: 'Object' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:entityMoved',
    label: '🧍 Сущность подвинулась',
    category: 'События',
    description: 'Вызывается, когда любая сущность перемещается.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'entity', name: 'Сущность', type: 'Object' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:entityGone',
    label: '❌ Сущность исчезла',
    category: 'События',
    description: 'Вызывается, когда сущность пропадает из зоны видимости бота.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'entity', name: 'Сущность', type: 'Object' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:botDied',
    label: '💀 Бот умер',
    category: 'События',
    description: 'Срабатывает, когда бот умирает.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:botStartup',
    label: '🚀 При запуске бота',
    category: 'События',
    description: 'Срабатывает один раз при запуске бота.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:health',
    label: '❤️ Здоровье/Голод изменилось',
    category: 'События',
    description: 'Срабатывает при изменении здоровья, голода или насыщения бота.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'health', name: 'Здоровье', type: 'Number' },
      { id: 'food', name: 'Голод', type: 'Number' },
      { id: 'saturation', name: 'Насыщение', type: 'Number' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:websocket_call',
    label: '📡 Вызов из WebSocket API',
    category: 'События',
    description: 'Срабатывает, когда граф вызывается через WebSocket API.',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'graphName', name: 'Имя графа', type: 'String' },
      { id: 'data', name: 'Данные', type: 'Object' },
      { id: 'socketId', name: 'Socket ID', type: 'String' },
      { id: 'keyPrefix', name: 'API ключ (префикс)', type: 'String' }
    ],
    defaultData: {},
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:custom_event',
    label: '▶️ Событие',
    category: 'События',
    description: 'Стартовая нода пользовательского события с динамическими параметрами',
    graphType: GRAPH_TYPES.EVENT,
    computeInputs: () => [],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      ...(data.pins || []).map((pin) => ({ id: pin.id, name: pin.name, type: pin.type }))
    ],
    evaluator: require('../../core/nodes/event/custom_event').evaluate,
    defaultData: { pins: [] },
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  },
  {
    type: 'event:call_event',
    label: 'Вызвать событие',
    category: 'Управление',
    description: 'Вызывает пользовательское событие и передаёт параметры',
    graphType: GRAPH_TYPES.ALL,
    computeInputs: (data, context) => {
      const pins = [{ id: 'exec', name: 'Выполнить', type: 'Exec' }];
      if (data.selectedEventId != null) {
        const selectedNode = (context.nodes || []).find(n => n.id === data.selectedEventId);
        if (selectedNode && selectedNode.type === 'event:custom_event') {
          (selectedNode.data.pins || [])
            .filter(pin => pin.type !== 'Exec')
            .forEach(pin => pins.push({ id: pin.id, name: pin.name, type: pin.type }));
        }
      }
      return pins;
    },
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' }
    ],
    executor: require('../../core/nodes/event/call_event').executor,
    defaultData: { selectedEventId: null },
    theme: { headerColor: '#8b5cf6', accentColor: '#a78bfa' }
  }
];

module.exports = eventsNodes;
