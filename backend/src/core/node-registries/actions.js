const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Действия"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'action:send_message',
    label: '🗣️ Отправить сообщение',
    category: 'Действия',
    description: 'Отправляет сообщение в чат. Поддерживает переменные в формате {varName}',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    executor: require('../nodes/actions/send_message').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'chat_type', name: 'Тип чата', type: 'String', required: true },
        { id: 'message', name: 'Сообщение', type: 'String', required: true },
        { id: 'recipient', name: 'Адресат', type: 'String', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'action:send_log',
    label: '📝 Записать в лог (веб)',
    category: 'Действия',
    description: 'Отправляет сообщение в консоль на странице бота.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/actions/send_log').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'message', name: 'Сообщение', type: 'String', required: true },
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' },
      ]
    }
  });

  registry.registerNodeType({
    type: 'action:send_websocket_response',
    label: '📤 Отправить ответ в WebSocket',
    category: 'WebSocket API',
    description: 'Отправляет данные обратно клиенту, вызвавшему граф через WebSocket API.',
    graphType: GRAPH_TYPES.EVENT,
    executor: require('../nodes/actions/send_websocket_response').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'data', name: 'Данные', type: 'Wildcard', required: true }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'action:bot_look_at',
    label: '🤖 Бот: Посмотреть на',
    category: 'Действия',
    description: 'Поворачивает голову бота в сторону координат или сущности.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/actions/bot_look_at').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'target', name: 'Цель (Позиция/Сущность)', type: 'Object', required: true },
        { id: 'add_y', name: 'Прибавить к Y', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'action:bot_set_variable',
    label: '💾 Записать переменную',
    category: 'Действия',
    description: 'Сохраняет значение в переменную графа.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/actions/bot_set_variable').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'name', name: 'Имя', type: 'String', required: true },
        { id: 'value', name: 'Значение', type: 'Wildcard', required: true },
        { id: 'persist', name: 'Хранить в БД?', type: 'Boolean', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'action:http_request',
    label: '🌐 HTTP-запрос',
    category: 'Действия',
    description: 'Выполняет HTTP-запрос (GET, POST, PUT, DELETE и т.д.) и возвращает ответ.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/actions/http_request').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'url', name: 'URL', type: 'String', required: true },
        { id: 'method', name: 'Метод', type: 'String', required: false },
        { id: 'headers', name: 'Заголовки (JSON)', type: 'String', required: false },
        { id: 'body', name: 'Тело (JSON)', type: 'Wildcard', required: false },
        { id: 'timeout', name: 'Таймаут (мс)', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Успех', type: 'Exec' },
        { id: 'exec_error', name: 'Ошибка', type: 'Exec' },
        { id: 'status', name: 'Статус', type: 'Number' },
        { id: 'response', name: 'Ответ', type: 'Wildcard' },
        { id: 'response_headers', name: 'Заголовки ответа', type: 'Object' },
        { id: 'success', name: 'Успешно', type: 'Boolean' },
        { id: 'error', name: 'Ошибка', type: 'String' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'action:create_command',
    label: '➕ Создать команду',
    category: 'Действия',
    description: 'Создает новую команду (временную или постоянную)',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/actions/create_command').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'name', name: 'Имя команды', type: 'String', required: true },
        { id: 'description', name: 'Описание', type: 'String', required: false },
        { id: 'aliases', name: 'Алиасы', type: 'Array', required: false },
        { id: 'cooldown', name: 'Кулдаун (сек)', type: 'Number', required: false },
        { id: 'allowedChatTypes', name: 'Типы чата', type: 'Array', required: false },
        { id: 'permissionName', name: 'Название права', type: 'String', required: false },
        { id: 'temporary', name: 'Временная?', type: 'Boolean', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' },
        { id: 'commandId', name: 'ID команды', type: 'Number' },
        { id: 'success', name: 'Успешно', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'action:update_command',
    label: '✏️ Редактировать команду',
    category: 'Действия',
    description: 'Изменяет параметры существующей команды',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/actions/update_command').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'commandName', name: 'Имя команды', type: 'String', required: true },
        { id: 'newName', name: 'Новое имя', type: 'String', required: false },
        { id: 'description', name: 'Описание', type: 'String', required: false },
        { id: 'aliases', name: 'Алиасы', type: 'Array', required: false },
        { id: 'cooldown', name: 'Кулдаун (сек)', type: 'Number', required: false },
        { id: 'allowedChatTypes', name: 'Типы чата', type: 'Array', required: false },
        { id: 'permissionName', name: 'Название права', type: 'String', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' },
        { id: 'success', name: 'Успешно', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'action:delete_command',
    label: '🗑️ Удалить команду',
    category: 'Действия',
    description: 'Удаляет существующую команду бота',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/actions/delete_command').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'commandName', name: 'Имя команды', type: 'String', required: true }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' },
        { id: 'success', name: 'Успешно', type: 'Boolean' }
      ]
    }
  });
}

module.exports = { registerNodes };
