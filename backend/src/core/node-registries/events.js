const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "События"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'event:command',
    label: '▶️ При выполнении команды',
    category: 'События',
    description: 'Стартовая точка для графа команды.',
    graphType: GRAPH_TYPES.ALL,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'command_name', name: 'Имя команды', type: 'String' },
        { id: 'user', name: 'Пользователь', type: 'User' },
        { id: 'args', name: 'Аргументы', type: 'Object' },
        { id: 'chat_type', name: 'Тип чата', type: 'String' },
        { id: 'success', name: 'Успешно', type: 'Boolean', description: 'Возвращает true, если команда не попала на ошибку (нет прав, кулдаун, неверный тип чата и т.д.)' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:chat',
    name: 'Событие: Сообщение в чате',
    label: '💬 Сообщение в чате',
    description: 'Срабатывает, когда в чат приходит сообщение.',
    category: 'События',
    graphType: GRAPH_TYPES.EVENT,
    isEvent: true,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', type: 'Exec', name: 'Выполнить' },
        { id: 'username', type: 'String', name: 'Игрок' },
        { id: 'message', type: 'String', name: 'Сообщение' },
        { id: 'chatType', type: 'String', name: 'Тип чата' },
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:raw_message',
    name: 'Событие: Сырое сообщение',
    label: '📝 Сырое сообщение',
    description: 'Срабатывает при получении любого сообщения в сыром виде (до парсинга).',
    category: 'События',
    graphType: GRAPH_TYPES.EVENT,
    isEvent: true,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', type: 'Exec', name: 'Выполнить' },
        { id: 'rawText', type: 'String', name: 'Сырой текст' },
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:playerJoined',
    label: '👋 Игрок зашел',
    category: 'События',
    description: 'Срабатывает, когда игрок заходит на сервер.',
    graphType: GRAPH_TYPES.EVENT,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'user', name: 'Пользователь', type: 'User' },
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:playerLeft',
    label: '🚪 Игрок вышел',
    category: 'События',
    description: 'Срабатывает, когда игрок покидает сервер.',
    graphType: GRAPH_TYPES.EVENT,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'user', name: 'Пользователь', type: 'User' },
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:entitySpawn',
    label: '📦 Сущность появилась',
    category: 'События',
    description: 'Вызывается, когда новая сущность появляется в поле зрения бота.',
    graphType: GRAPH_TYPES.EVENT,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'entity', name: 'Сущность', type: 'Object' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:entityMoved',
    label: '🧍 Сущность подвинулась',
    category: 'События',
    description: 'Вызывается, когда любая сущность перемещается.',
    graphType: GRAPH_TYPES.EVENT,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'entity', name: 'Сущность', type: 'Object' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:entityGone',
    label: '❌ Сущность исчезла',
    category: 'События',
    description: 'Вызывается, когда сущность пропадает из зоны видимости бота.',
    graphType: GRAPH_TYPES.EVENT,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'entity', name: 'Сущность', type: 'Object' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:botDied',
    label: '💀 Бот умер',
    category: 'События',
    description: 'Срабатывает, когда бот умирает.',
    graphType: GRAPH_TYPES.EVENT,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:health',
    label: '❤️ Здоровье/Голод изменилось',
    category: 'События',
    description: 'Срабатывает при изменении здоровья, голода или насыщения бота.',
    graphType: GRAPH_TYPES.EVENT,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'health', name: 'Здоровье', type: 'Number' },
        { id: 'food', name: 'Голод', type: 'Number' },
        { id: 'saturation', name: 'Насыщение', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'event:websocket_call',
    label: '📡 Вызов из WebSocket API',
    category: 'События',
    description: 'Срабатывает, когда граф вызывается через WebSocket API методом callGraph().',
    graphType: GRAPH_TYPES.EVENT,
    pins: {
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'graphName', name: 'Имя графа', type: 'String' },
        { id: 'data', name: 'Данные', type: 'Object' },
        { id: 'socketId', name: 'Socket ID', type: 'String' },
        { id: 'keyPrefix', name: 'API ключ (префикс)', type: 'String' }
      ]
    }
  });
}

module.exports = { registerNodes };
