const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const actionNodes = [
  {
    type: 'action:send_message',
    label: '🗣️ Отправить сообщение',
    category: 'Действия',
    description: 'Отправляет сообщение в чат. Поддерживает переменные в формате {varName}',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/actions/send_message').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'chat_type', name: 'Тип чата', type: 'String', required: true, inlineField: true, placeholder: 'global' },
      { id: 'message', name: 'Сообщение', type: 'String', required: true, inlineField: true, placeholder: 'Привет!' },
      { id: 'recipient', name: 'Адресат', type: 'String', required: false, inlineField: true, placeholder: 'никнейм' }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' }
    ],
    defaultData: { chat_type: 'global', message: '', recipient: '' },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'action:send_log',
    label: '📝 Записать в лог (веб)',
    category: 'Действия',
    description: 'Отправляет сообщение в консоль на странице бота.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/actions/send_log').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'message', name: 'Сообщение', type: 'String', required: true, inlineField: true, placeholder: 'Отладочное сообщение' }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' }
    ],
    defaultData: { message: '' },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'action:send_websocket_response',
    label: '📤 Отправить ответ в WebSocket',
    category: 'WebSocket API',
    description: 'Отправляет данные обратно клиенту, вызвавшему граф через WebSocket API.',
    graphType: GRAPH_TYPES.EVENT,
    executor: require('../../core/nodes/actions/send_websocket_response').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'data', name: 'Данные', type: 'Wildcard', required: true }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' }
    ],
    defaultData: { data: null },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'action:bot_look_at',
    label: '🤖 Бот: Посмотреть на',
    category: 'Действия',
    description: 'Поворачивает голову бота в сторону координат или сущности.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/actions/bot_look_at').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'target', name: 'Цель (Позиция/Сущность)', type: 'Object', required: true },
      { id: 'add_y', name: 'Прибавить к Y', type: 'Number', required: false, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' }
    ],
    defaultData: { target: null, add_y: 0 },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'action:bot_set_variable',
    label: '💾 Записать переменную',
    category: 'Действия',
    description: 'Сохраняет значение в переменную графа.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/actions/bot_set_variable').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'name', name: 'Имя', type: 'String', required: true, inlineField: true, placeholder: 'myVariable' },
      { id: 'value', name: 'Значение', type: 'Wildcard', required: true },
      { id: 'persist', name: 'Хранить в БД?', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' }
    ],
    defaultData: { name: '', value: null, persist: false },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'action:http_request',
    label: '🌐 HTTP-запрос',
    category: 'Действия',
    description: 'Выполняет HTTP-запрос (GET, POST, PUT, DELETE и т.д.) и возвращает ответ.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/actions/http_request').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'url', name: 'URL', type: 'String', required: true, inlineField: true, placeholder: 'https://api.example.com' },
      { id: 'method', name: 'Метод', type: 'String', required: false, inlineField: true, placeholder: 'GET' },
      { id: 'queryParams', name: 'Query Params', type: 'Object', required: false },
      { id: 'headers', name: 'Headers', type: 'Object', required: false },
      { id: 'body', name: 'Тело (JSON)', type: 'Wildcard', required: false },
      { id: 'timeout', name: 'Таймаут (мс)', type: 'Number', required: false, inlineField: true, placeholder: '5000' }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Успех', type: 'Exec' },
      { id: 'exec_error', name: 'Ошибка', type: 'Exec' },
      { id: 'status', name: 'Статус', type: 'Number' },
      { id: 'response', name: 'Ответ', type: 'Wildcard' },
      { id: 'response_headers', name: 'Заголовки ответа', type: 'Object' },
      { id: 'success', name: 'Успешно', type: 'Boolean' },
      { id: 'error', name: 'Ошибка', type: 'String' }
    ],
    defaultData: { url: '', method: 'GET', queryParams: null, headers: null, body: null, timeout: 5000 },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'action:create_command',
    label: '➕ Создать команду',
    category: 'Действия',
    description: 'Создает новую команду (временную или постоянную)',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/actions/create_command').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'name', name: 'Имя команды', type: 'String', required: true, inlineField: true, placeholder: 'mycommand' },
      { id: 'description', name: 'Описание', type: 'String', required: false, inlineField: true, placeholder: 'Описание команды' },
      { id: 'aliases', name: 'Алиасы', type: 'Array', required: false },
      { id: 'cooldown', name: 'Кулдаун (сек)', type: 'Number', required: false, inlineField: true, placeholder: '0' },
      { id: 'allowedChatTypes', name: 'Типы чата', type: 'Array', required: false },
      { id: 'permissionName', name: 'Название права', type: 'String', required: false, inlineField: true, placeholder: 'everyone' },
      { id: 'temporary', name: 'Временная?', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' },
      { id: 'commandId', name: 'ID команды', type: 'Number' },
      { id: 'success', name: 'Успешно', type: 'Boolean' }
    ],
    defaultData: { name: '', description: '', aliases: [], cooldown: 0, allowedChatTypes: [], permissionName: '', temporary: false },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'action:update_command',
    label: '✏️ Редактировать команду',
    category: 'Действия',
    description: 'Изменяет параметры существующей команды',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/actions/update_command').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'commandName', name: 'Имя команды', type: 'String', required: true, inlineField: true, placeholder: 'mycommand' },
      { id: 'newName', name: 'Новое имя', type: 'String', required: false, inlineField: true, placeholder: 'newcommand' },
      { id: 'description', name: 'Описание', type: 'String', required: false, inlineField: true, placeholder: 'Новое описание' },
      { id: 'aliases', name: 'Алиасы', type: 'Array', required: false },
      { id: 'cooldown', name: 'Кулдаун (сек)', type: 'Number', required: false, inlineField: true, placeholder: '0' },
      { id: 'allowedChatTypes', name: 'Типы чата', type: 'Array', required: false },
      { id: 'permissionName', name: 'Название права', type: 'String', required: false, inlineField: true, placeholder: 'everyone' }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' },
      { id: 'success', name: 'Успешно', type: 'Boolean' }
    ],
    defaultData: { commandName: '', newName: '', description: '', aliases: [], cooldown: 0, allowedChatTypes: [], permissionName: '' },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'action:delete_command',
    label: '🗑️ Удалить команду',
    category: 'Действия',
    description: 'Удаляет существующую команду бота',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/actions/delete_command').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec' },
      { id: 'commandName', name: 'Имя команды', type: 'String', required: true, inlineField: true, placeholder: 'mycommand' }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Выполнено', type: 'Exec' },
      { id: 'success', name: 'Успешно', type: 'Boolean' }
    ],
    defaultData: { commandName: '' },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  }
];

module.exports = actionNodes;
