const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Данные"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'data:get_argument',
    label: '📥 Получить аргумент',
    category: 'Данные',
    description: 'Получает значение аргумента команды по его имени.',
    graphType: GRAPH_TYPES.COMMAND,
    evaluator: require('../nodes/data/get_argument').evaluate,
    data: {
      argumentName: {
        type: 'argument',
        label: 'Аргумент'
      }
    },
    pins: {
      inputs: [],
      outputs: [
        { id: 'value', name: 'Значение', type: 'Any' },
        { id: 'exists', name: 'Существует', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:get_variable',
    label: '📤 Получить переменную',
    category: 'Данные',
    description: 'Получает значение переменной графа.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/get_variable').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'value', name: 'Значение', type: 'Wildcard' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:get_entity_field',
    label: '📦 Получить поле сущности',
    category: 'Данные',
    description: 'Получает определенное поле из объекта сущности (например, "position.x", "username").',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/get_entity_field').evaluate,
    pins: {
      inputs: [
        { id: 'entity', name: 'Сущность', type: 'Object', required: true },
      ],
      outputs: [
        { id: 'username', name: 'Никнейм', type: 'String' },
        { id: 'type', name: 'Тип', type: 'String' },
        { id: 'position', name: 'Позиция', type: 'Object' },
        { id: 'isValid', name: 'Валидна', type: 'Boolean' },
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:string_literal',
    label: '📜 Строка',
    category: 'Данные',
    description: 'Текстовое значение с поддержкой переменных. Используйте {имя} для вставки значений.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../nodes/data/string_literal').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'value', name: 'Значение', type: 'String' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:number_literal',
    label: '🔢 Число',
    category: 'Данные',
    description: 'Простое числовое значение.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/number_literal').evaluate,
    pins: {
      inputs: [
        { id: 'value', name: 'Значение', type: 'Number', required: true }
      ],
      outputs: [
        { id: 'value', name: 'Значение', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:boolean_literal',
    label: '✔️ Булево',
    category: 'Данные',
    description: 'Значение Истина/Ложь.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/boolean_literal').evaluate,
    pins: {
      inputs: [
        { id: 'value', name: 'Значение', type: 'Boolean', required: true }
      ],
      outputs: [
        { id: 'value', name: 'Значение', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:make_object',
    label: '🏗️ Собрать объект',
    category: 'Данные',
    description: 'Создает JSON-объект из пар ключ-значение.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../nodes/data/make_object').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'value', name: 'Объект', type: 'Object' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:cast',
    label: '✨ Приведение типов',
    category: 'Данные',
    description: 'Приводит входящее значение к указанному целевому типу.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/cast').evaluate,
    pins: {
      inputs: [
        { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
      ],
      outputs: [
        { id: 'value', name: 'Значение', type: 'Wildcard' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:type_check',
    label: '🔍 Проверка типа',
    category: 'Данные',
    description: 'Проверяет тип входного значения.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/type_check').evaluate,
    pins: {
      inputs: [
        { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Совпадает?', type: 'Boolean', description: 'True, если значение соответствует выбранному типу' },
        { id: 'type_name', name: 'Имя типа', type: 'String', description: 'Фактическое название типа значения' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:get_server_players',
    label: '👥 Список игроков',
    category: 'Данные',
    graphType: GRAPH_TYPES.ALL,
    description: 'Возвращает массив с именами всех игроков на сервере.',
    evaluator: require('../nodes/data/get_server_players').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'players', name: 'Игроки', type: 'Array' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:get_nearby_entities',
    label: '👁️ Получить существ рядом',
    category: 'Данные',
    description: 'Возвращает массив существ в радиусе от бота.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/get_nearby_entities').evaluate,
    pins: {
      inputs: [
        { id: 'radius', name: 'Радиус', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'entities', name: 'Существа', type: 'Array' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:get_nearby_players',
    label: '👥 Игроки рядом',
    category: 'Данные',
    description: 'Возвращает массив игроков с расстоянием.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/get_nearby_players').evaluate,
    pins: {
      inputs: [
        { id: 'radius', name: 'Радиус', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'players', name: 'Игроки', type: 'Array' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:entity_info',
    label: '🔍 Информация о существе',
    category: 'Данные',
    description: 'Извлекает данные из объекта существа.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/entity_info').evaluate,
    pins: {
      inputs: [
        { id: 'entity', name: 'Существо', type: 'Object', required: true }
      ],
      outputs: [
        { id: 'type', name: 'Тип', type: 'String' },
        { id: 'username', name: 'Имя', type: 'String' },
        { id: 'distance', name: 'Расстояние', type: 'Number' },
        { id: 'position', name: 'Позиция', type: 'Object' },
        { id: 'id', name: 'ID', type: 'Number' },
        { id: 'isPlayer', name: 'Это игрок?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:get_user_field',
    label: '👤 Данные пользователя',
    category: 'Данные',
    description: 'Получает различные данные из объекта пользователя.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/get_user_field').evaluate,
    pins: {
      inputs: [
        { id: 'user', name: 'Пользователь', type: 'User', required: true }
      ],
      outputs: [
        { id: 'username', name: 'Никнейм', type: 'String' },
        { id: 'groups', name: 'Группы', type: 'Array' },
        { id: 'permissions', name: 'Права', type: 'Array' },
        { id: 'isBlacklisted', name: 'В черном списке', type: 'Boolean' },
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:length',
    label: '📏 Размер (длина)',
    category: 'Массив',
    graphType: GRAPH_TYPES.ALL,
    description: 'Возвращает количество элементов в массиве или длину строки.',
    evaluator: require('../nodes/data/length').evaluate,
    pins: {
      inputs: [
        { id: 'data', name: 'Массив или Строка', type: 'Any', required: true }
      ],
      outputs: [
        { id: 'length', name: 'Длина', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'data:array_literal',
    label: '📋 Массив',
    category: 'Массив',
    description: 'Создает массив из элементов.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../nodes/data/array_literal').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'value', name: 'Массив', type: 'Array' }
      ]
    }
  });
}

module.exports = { registerNodes };
