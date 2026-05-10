const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const dataNodes = [
  {
    type: 'data:get_argument',
    label: '📥 Получить аргумент',
    category: 'Данные',
    description: 'Получает значение аргумента команды по его имени.',
    graphType: GRAPH_TYPES.COMMAND,
    evaluator: require('../../core/nodes/data/get_argument').evaluate,
    computeInputs: (data) => [],
    computeOutputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Any' },
      { id: 'exists', name: 'Существует', type: 'Boolean' }
    ],
    defaultData: { argumentName: '' }
  },
  {
    type: 'data:get_variable',
    label: '📤 Получить переменную',
    category: 'Данные',
    description: 'Получает значение переменной графа.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/get_variable').evaluate,
    computeInputs: (data) => [],
    computeOutputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Wildcard' }
    ],
    defaultData: {}
  },
  {
    type: 'data:get_entity_field',
    label: '📦 Получить поле сущности',
    category: 'Данные',
    description: 'Получает определенное поле из объекта сущности (например, "position.x", "username").',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/get_entity_field').evaluate,
    computeInputs: (data) => [
      { id: 'entity', name: 'Сущность', type: 'Object', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'username', name: 'Никнейм', type: 'String' },
      { id: 'type', name: 'Тип', type: 'String' },
      { id: 'position', name: 'Позиция', type: 'Object' },
      { id: 'isValid', name: 'Валидна', type: 'Boolean' }
    ],
    defaultData: {}
  },
  {
    type: 'data:string_literal',
    label: '📜 Строка',
    category: 'Данные',
    description: 'Текстовое значение с поддержкой переменных. Используйте {имя} для вставки значений.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../../core/nodes/data/string_literal').evaluate,
    computeInputs: (data) => [],
    computeOutputs: (data) => [
      { id: 'value', name: 'Значение', type: 'String' }
    ],
    defaultData: {}
  },
  {
    type: 'data:number_literal',
    label: '🔢 Число',
    category: 'Данные',
    description: 'Простое числовое значение.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/number_literal').evaluate,
    computeInputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Number', required: true, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Number' }
    ],
    defaultData: { value: 0 }
  },
  {
    type: 'data:boolean_literal',
    label: '✔️ Булево',
    category: 'Данные',
    description: 'Значение Истина/Ложь.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/boolean_literal').evaluate,
    computeInputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Boolean', required: true, inlineField: true, placeholder: 'true' }
    ],
    computeOutputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Boolean' }
    ],
    defaultData: { value: true }
  },
  {
    type: 'data:make_object',
    label: '🏗️ Собрать объект',
    category: 'Данные',
    description: 'Создает JSON-объект из пар ключ-значение.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../../core/nodes/data/make_object').evaluate,
    computeInputs: (data) => [],
    computeOutputs: (data) => [
      { id: 'value', name: 'Объект', type: 'Object' }
    ],
    defaultData: {}
  },
  {
    type: 'data:cast',
    label: '✨ Приведение типов',
    category: 'Данные',
    description: 'Приводит входящее значение к указанному целевому типу.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/cast').evaluate,
    computeInputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'result', name: 'Результат', type: 'Wildcard' }
    ],
    defaultData: { targetType: 'String' }
  },
  {
    type: 'data:type_check',
    label: '🔍 Проверка типа',
    category: 'Данные',
    description: 'Проверяет тип входного значения.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/type_check').evaluate,
    computeInputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'result', name: 'Совпадает?', type: 'Boolean', description: 'True, если значение соответствует выбранному типу' },
      { id: 'type_name', name: 'Имя типа', type: 'String', description: 'Фактическое название типа значения' }
    ],
    defaultData: { checkType: 'String' }
  },
  {
    type: 'data:get_server_players',
    label: '👥 Список игроков',
    category: 'Данные',
    graphType: GRAPH_TYPES.ALL,
    description: 'Возвращает массив с именами всех игроков на сервере.',
    evaluator: require('../../core/nodes/data/get_server_players').evaluate,
    computeInputs: (data) => [],
    computeOutputs: (data) => [
      { id: 'players', name: 'Игроки', type: 'Array' }
    ],
    defaultData: {}
  },
  {
    type: 'data:get_nearby_entities',
    label: '👁️ Получить существ рядом',
    category: 'Данные',
    description: 'Возвращает массив существ в радиусе от бота.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/get_nearby_entities').evaluate,
    computeInputs: (data) => [
      { id: 'radius', name: 'Радиус', type: 'Number', required: false, inlineField: true, placeholder: '10' }
    ],
    computeOutputs: (data) => [
      { id: 'entities', name: 'Существа', type: 'Array' }
    ],
    defaultData: { radius: 10 }
  },
  {
    type: 'data:get_nearby_players',
    label: '👥 Игроки рядом',
    category: 'Данные',
    description: 'Возвращает массив игроков с расстоянием.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/get_nearby_players').evaluate,
    computeInputs: (data) => [
      { id: 'radius', name: 'Радиус', type: 'Number', required: false, inlineField: true, placeholder: '10' }
    ],
    computeOutputs: (data) => [
      { id: 'players', name: 'Игроки', type: 'Array' }
    ],
    defaultData: { radius: 10 }
  },
  {
    type: 'data:entity_info',
    label: '🔍 Информация о существе',
    category: 'Данные',
    description: 'Извлекает данные из объекта существа.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/entity_info').evaluate,
    computeInputs: (data) => [
      { id: 'entity', name: 'Существо', type: 'Object', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'type', name: 'Тип', type: 'String' },
      { id: 'username', name: 'Имя', type: 'String' },
      { id: 'distance', name: 'Расстояние', type: 'Number' },
      { id: 'position', name: 'Позиция', type: 'Object' },
      { id: 'id', name: 'ID', type: 'Number' },
      { id: 'isPlayer', name: 'Это игрок?', type: 'Boolean' }
    ],
    defaultData: {}
  },
  {
    type: 'data:get_user_field',
    label: '👤 Данные пользователя',
    category: 'Данные',
    description: 'Получает различные данные из объекта пользователя.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/get_user_field').evaluate,
    computeInputs: (data) => [
      { id: 'user', name: 'Пользователь', type: 'User', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'username', name: 'Никнейм', type: 'String' },
      { id: 'groups', name: 'Группы', type: 'Array' },
      { id: 'permissions', name: 'Права', type: 'Array' },
      { id: 'isBlacklisted', name: 'В черном списке', type: 'Boolean' }
    ],
    defaultData: {}
  },
  {
    type: 'data:length',
    label: '📏 Размер (длина)',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Возвращает количество элементов в массиве или длину строки.',
    evaluator: require('../../core/nodes/data/length').evaluate,
    computeInputs: (data) => [
      { id: 'data', name: 'Массив или Строка', type: 'Any', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'length', name: 'Длина', type: 'Number' }
    ],
    defaultData: {}
  },
  {
    type: 'data:array_literal',
    label: '📋 Массив',
    category: 'Массив',
    description: 'Создает массив из элементов.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../../core/nodes/data/array_literal').evaluate,
    computeInputs: (data) => [],
    computeOutputs: (data) => [
      { id: 'value', name: 'Массив', type: 'Array' }
    ],
    defaultData: {}
  },
  {
    type: 'data:store_read',
    label: 'Прочитать из Store',
    category: 'Данные',
    description: 'Читает значение из хранилища плагина (PluginDataStore) по ключу.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/data/store_read').evaluate,
    computeInputs: (data) => [
      { id: 'plugin_name', name: 'Плагин', type: 'String', required: true, inlineField: true, placeholder: 'my-plugin' },
      { id: 'key', name: 'Ключ', type: 'String', required: true, inlineField: true, placeholder: 'myKey' }
    ],
    computeOutputs: (data) => [
      { id: 'value', name: 'Значение', type: 'Wildcard' }
    ],
    defaultData: { plugin_name: '', key: '' }
  },
  {
    type: 'data:store_write',
    label: 'Записать в Store',
    category: 'Данные',
    description: 'Сохраняет значение в хранилище плагина (PluginDataStore) по ключу.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/data/store_write').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
      { id: 'plugin_name', name: 'Плагин', type: 'String', required: true, inlineField: true, placeholder: 'my-plugin' },
      { id: 'key', name: 'Ключ', type: 'String', required: true, inlineField: true, placeholder: 'myKey' },
      { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Далее', type: 'Exec' }
    ],
    defaultData: { plugin_name: '', key: '' }
  }
];

module.exports = dataNodes;
