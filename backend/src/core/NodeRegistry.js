/**
 * @typedef {object} NodePin
 * @property {string} id - Уникальный идентификатор пина (например, "exec", "data_result").
 * @property {string} name - Читаемое имя пина.
 * @property {string} type - Тип данных пина ("Exec", "String", "Boolean" и т.д.).
 * @property {boolean} [required] - Является ли этот пин обязательным.
 */

/**
 * @typedef {object} NodeConfig
 * @property {string} type - Уникальный идентификатор типа узла (например, "action:send_message").
 * @property {string} label - Читаемое имя узла.
 * @property {string} category - Категория для группировки в интерфейсе.
 * @property {string} description - Описание узла.
 * @property {NodePin[]} inputs - Массив описаний входных пинов.
 * @property {NodePin[]} outputs - Массив описаний выходных пинов.
 * @property {Function} [executor] - Функция для выполнения этого узла (на бэкенде).
 */

/**
 * Реестр для управления всеми доступными типами узлов.
 */
class NodeRegistry {
  constructor() {
    this.nodes = new Map();
    this._registerBaseNodes();
  }

  /**
   * Регистрирует новый тип узла.
   * @param {NodeConfig} nodeConfig - Конфигурация узла.
   */
  registerNodeType(nodeConfig) {
    if (!nodeConfig.type) {
      throw new Error('Node type is required');
    }
    
    if (this.nodes.has(nodeConfig.type)) {
      console.warn(`Node type '${nodeConfig.type}' is already registered. Overriding.`);
    }

    this.nodes.set(nodeConfig.type, nodeConfig);
    //console.log(`Registered node type: ${nodeConfig.type}`);
  }

  /**
   * Получает конфигурацию узла по его типу.
   * @param {string} nodeType - Идентификатор типа узла.
   * @returns {NodeConfig|undefined}
   */
  getNodeConfig(nodeType) {
    return this.nodes.get(nodeType);
  }

  /**
   * Получает все зарегистрированные типы узлов.
   * @returns {NodeConfig[]}
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Возвращает узлы, сгруппированные по категориям.
   * @param {string} [graphType] - Тип графа ('command' или 'event') для фильтрации узлов.
   * @returns {Object.<string, NodeConfig[]>} - Объект с узлами, сгруппированными по категориям.
   */
  getNodesByCategory(graphType) {
    const result = {};
    for (const node of this.nodes.values()) {
      if (node.graphType === 'all' || node.graphType === graphType) {
        if (!result[node.category]) {
          result[node.category] = [];
        }
        result[node.category].push(node);
      }
    }
    return result;
  }

  /**
   * Проверяет, существует ли тип узла.
   * @param {string} nodeType - Идентификатор типа узла.
   * @returns {boolean}
   */
  hasNodeType(nodeType) {
    return this.nodes.has(nodeType);
  }

  /**
   * Регистрирует базовую библиотеку узлов.
   * @private
   */
  _registerBaseNodes() {
    const all = 'all';
    const command = 'command';
    const event = 'event';

    // События
    this.registerNodeType({
      type: 'event:command',
      label: '▶️ При выполнении команды',
      category: 'События',
      description: 'Стартовая точка для графа команды.',
      graphType: 'all',
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

    this.registerNodeType({
        type: 'event:chat',
        name: 'Событие: Сообщение в чате',
        label: '💬 Сообщение в чате',
        description: 'Срабатывает, когда в чат приходит сообщение.',
        category: 'События',
        graphType: event,
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

    this.registerNodeType({
        type: 'event:raw_message',
        name: 'Событие: Сырое сообщение',
        label: '📝 Сырое сообщение',
        description: 'Срабатывает при получении любого сообщения в сыром виде (до парсинга).',
        category: 'События',
        graphType: event,
        isEvent: true,
        pins: {
            inputs: [],
            outputs: [
                { id: 'exec', type: 'Exec', name: 'Выполнить' },
                { id: 'rawText', type: 'String', name: 'Сырой текст' },
            ]
        }
    });

    this.registerNodeType({
      type: 'event:playerJoined',
      label: '👋 Игрок зашел',
      category: 'События',
      description: 'Срабатывает, когда игрок заходит на сервер.',
      graphType: event,
      pins: {
        inputs: [],
        outputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec' },
          { id: 'user', name: 'Пользователь', type: 'User' },
        ]
      }
    });

    this.registerNodeType({
      type: 'event:playerLeft',
      label: '🚪 Игрок вышел',
      category: 'События',
      description: 'Срабатывает, когда игрок покидает сервер.',
      graphType: event,
      pins: {
        inputs: [],
        outputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec' },
          { id: 'user', name: 'Пользователь', type: 'User' },
        ]
      }
    });

    this.registerNodeType({
      type: 'event:entitySpawn',
      label: '📦 Сущность появилась',
      category: 'События',
      description: 'Вызывается, когда новая сущность появляется в поле зрения бота.',
      graphType: event,
      pins: {
        inputs: [],
        outputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec' },
          { id: 'entity', name: 'Сущность', type: 'Object' }
        ]
      }
    });

    this.registerNodeType({
      type: 'event:entityMoved',
      label: '🧍 Сущность подвинулась',
      category: 'События',
      description: 'Вызывается, когда любая сущность перемещается.',
      graphType: event,
      pins: {
        inputs: [],
        outputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec' },
          { id: 'entity', name: 'Сущность', type: 'Object' }
        ]
      }
    });
    
    this.registerNodeType({
      type: 'event:entityGone',
      label: '❌ Сущность исчезла',
      category: 'События',
      description: 'Вызывается, когда сущность пропадает из зоны видимости бота.',
      graphType: event,
      pins: {
        inputs: [],
        outputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec' },
          { id: 'entity', name: 'Сущность', type: 'Object' }
        ]
      }
    });

    this.registerNodeType({
      type: 'flow:branch',
      label: '↔️ Ветвление (Branch)',
      category: 'Поток',
      description: 'if/else логика',
      graphType: all,
      executor: require('./nodes/flow_branch').execute,
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
          { id: 'condition', name: 'Условие', type: 'Boolean', required: true }
        ],
        outputs: [
          { id: 'exec_true', name: 'True', type: 'Exec' },
          { id: 'exec_false', name: 'False', type: 'Exec' }
        ]
      }
    });

    this.registerNodeType({
      type: 'flow:sequence',
      label: '⛓️ Последовательность',
      category: 'Поток',
      description: 'Выполняет действия по очереди',
      graphType: all,
      executor: require('./nodes/flow_sequence').execute,
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true }
        ],
        outputs: [
          { id: 'exec_0', name: '0', type: 'Exec' },
          { id: 'exec_1', name: '1', type: 'Exec' }
        ]
      }
    });

    this.registerNodeType({
      type: 'flow:for_each',
      label: '🔁 Перебор массива (цикл)',
      category: 'Поток',
      description: 'Выполняет "Тело цикла" для каждого элемента в "Массиве".',
      graphType: all,
      executor: require('./nodes/flow_for_each').execute,
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
          { id: 'array', name: 'Массив', type: 'Array', required: true }
        ],
        outputs: [
          { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
          { id: 'element', name: 'Элемент', type: 'Any' },
          { id: 'index', name: 'Индекс', type: 'Number' },
          { id: 'completed', name: 'Завершено', type: 'Exec' }
        ]
      }
    });

    this.registerNodeType({
      type: 'flow:while',
      label: '🔁 Цикл While',
      category: 'Поток',
      description: 'Выполняет "Тело цикла" пока условие истинно.',
      graphType: all,
      executor: require('./nodes/flow_while').execute,
      evaluator: require('./nodes/flow_while').evaluate,
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
          { id: 'condition', name: 'Условие', type: 'Boolean', required: true }
        ],
        outputs: [
          { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
          { id: 'iteration', name: 'Итерация', type: 'Number' },
          { id: 'completed', name: 'Завершено', type: 'Exec' }
        ]
      }
    });

    this.registerNodeType({
      type: 'flow:break',
      label: '🛑 Выйти из цикла',
      category: 'Поток',
      description: 'Немедленно прерывает выполнение цикла (For Each Loop) и передает управление на его выход Completed.',
      graphType: all,
      executor: require('./nodes/flow_break').execute,
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true }
        ],
        outputs: []
      }
    });

    this.registerNodeType({
      type: 'action:send_message',
      label: '🗣️ Отправить сообщение',
      category: 'Действия',
      description: 'Отправляет сообщение в чат. Поддерживает переменные в формате {varName}',
      graphType: all,
      dynamicPins: true,
      executor: require('./nodes/action_send_message').execute,
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

    this.registerNodeType({
        type: 'action:send_log',
        label: '📝 Записать в лог (веб)',
        category: 'Действия',
        description: 'Отправляет сообщение в консоль на странице бота.',
        graphType: all,
        executor: require('./nodes/action_send_log').execute,
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

    this.registerNodeType({
        type: 'action:send_websocket_response',
        label: '📤 Отправить ответ в WebSocket',
        category: 'WebSocket API',
        description: 'Отправляет данные обратно клиенту, вызвавшему граф через WebSocket API.',
        graphType: event,
        executor: require('./nodes/action_send_websocket_response').execute,
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

    this.registerNodeType({
      type: 'action:bot_look_at',
      label: '🤖 Бот: Посмотреть на',
      category: 'Действия',
      description: 'Поворачивает голову бота в сторону координат или сущности.',
      graphType: all,
      executor: require('./nodes/action_bot_look_at').execute,
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
    
    this.registerNodeType({
      type: 'action:bot_set_variable',
      label: '💾 Записать переменную',
      category: 'Действия',
      description: 'Сохраняет значение в переменную графа.',
      graphType: all,
      executor: require('./nodes/action_bot_set_variable').execute,
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

    this.registerNodeType({
      type: 'action:http_request',
      label: '🌐 HTTP-запрос',
      category: 'Действия',
      description: 'Выполняет HTTP-запрос (GET, POST, PUT, DELETE и т.д.) и возвращает ответ.',
      graphType: all,
      executor: require('./nodes/action_http_request').execute,
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

    this.registerNodeType({
      type: 'data:get_argument',
      label: '📥 Получить аргумент',
      category: 'Данные',
      description: 'Получает значение аргумента команды по его имени.',
      graphType: command,
      evaluator: require('./nodes/data_get_argument').evaluate,
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

    this.registerNodeType({
        type: 'data:get_variable',
        label: '📤 Получить переменную',
        category: 'Данные',
        description: 'Получает значение переменной графа.',
        graphType: all,
        evaluator: require('./nodes/data_get_variable').evaluate,
        pins: {
            inputs: [],
            outputs: [
                { id: 'value', name: 'Значение', type: 'Wildcard' }
            ]
        }
    });
    
    this.registerNodeType({
      type: 'data:get_entity_field',
      label: '📦 Получить поле сущности',
      category: 'Данные',
      description: 'Получает определенное поле из объекта сущности (например, "position.x", "username").',
      graphType: all,
      evaluator: require('./nodes/data_get_entity_field').evaluate,
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
    
    this.registerNodeType({
      type: 'data:string_literal',
      label: '📜 Строка',
      category: 'Данные',
      description: 'Текстовое значение с поддержкой переменных. Используйте {имя} для вставки значений.',
      graphType: all,
      dynamicPins: true,
      evaluator: require('./nodes/data_string_literal').evaluate,
      pins: {
        inputs: [],
        outputs: [
          { id: 'value', name: 'Значение', type: 'String' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:number_literal',
      label: '🔢 Число',
      category: 'Данные',
      description: 'Простое числовое значение.',
      graphType: all,
      evaluator: require('./nodes/data_number_literal').evaluate,
      pins: {
        inputs: [
          { id: 'value', name: 'Значение', type: 'Number', required: true }
        ],
        outputs: [
          { id: 'value', name: 'Значение', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:boolean_literal',
      label: '✔️ Булево',
      category: 'Данные',
      description: 'Значение Истина/Ложь.',
      graphType: all,
      evaluator: require('./nodes/data_boolean_literal').evaluate,
      pins: {
        inputs: [
          { id: 'value', name: 'Значение', type: 'Boolean', required: true }
        ],
        outputs: [
          { id: 'value', name: 'Значение', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:array_literal',
      label: '📋 Массив',
      category: 'Массив',
      description: 'Создает массив из элементов.',
      graphType: all,
      dynamicPins: true,
      evaluator: require('./nodes/data_array_literal').evaluate,
      pins: {
        inputs: [],
        outputs: [
          { id: 'value', name: 'Массив', type: 'Array' }
        ]
      }
    });
    
    this.registerNodeType({
      type: 'data:make_object',
      label: '🏗️ Собрать объект',
      category: 'Данные',
      description: 'Создает JSON-объект из пар ключ-значение.',
      graphType: all,
      dynamicPins: true,
      evaluator: require('./nodes/data_make_object').evaluate,
      pins: {
        inputs: [],
        outputs: [
          { id: 'value', name: 'Объект', type: 'Object' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:cast',
      label: '✨ Приведение типов',
      category: 'Данные',
      description: 'Приводит входящее значение к указанному целевому типу.',
      graphType: all,
      evaluator: require('./nodes/data_cast').evaluate,
      pins: {
        inputs: [
          { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'value', name: 'Значение', type: 'Wildcard' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:type_check',
      label: '🔍 Проверка типа',
      category: 'Данные',
      description: 'Проверяет тип входного значения.',
      graphType: all,
      evaluator: require('./nodes/data_type_check').evaluate,
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

    this.registerNodeType({
      type: 'data:length',
      label: '📏 Размер (длина)',
      category: 'Массив',
      graphType: 'all',
      description: 'Возвращает количество элементов в массиве или длину строки.',
      evaluator: require('./nodes/data_length').evaluate,
      pins: {
        inputs: [
          { id: 'data', name: 'Массив или Строка', type: 'Any', required: true }
        ],
        outputs: [
          { id: 'length', name: 'Длина', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:contains',
      label: '🔍 Строка содержит',
      category: 'Строки',
      description: 'Проверяет, содержит ли одна строка другую.',
      graphType: all,
      evaluator: require('./nodes/string_contains').evaluate,
      pins: {
        inputs: [
          { id: 'haystack', name: 'Строка', type: 'String', required: true },
          { id: 'needle', name: 'Подстрока', type: 'String', required: true },
          { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
        ],
        outputs: [
          { id: 'result', name: 'Содержит?', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:matches',
      label: '🔎 RegEx совпадает',
      category: 'Строки',
      description: 'Проверяет совпадение с регулярным выражением.',
      graphType: all,
      evaluator: require('./nodes/string_matches').evaluate,
      pins: {
        inputs: [
          { id: 'string', name: 'Строка', type: 'String', required: true },
          { id: 'regex', name: 'RegEx', type: 'String', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Совпадает?', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:equals',
      label: '🔤 Строка равна',
      category: 'Строки',
      description: 'Проверяет равенство двух строк.',
      graphType: all,
      evaluator: require('./nodes/string_equals').evaluate,
      pins: {
        inputs: [
          { id: 'a', name: 'A', type: 'String', required: true },
          { id: 'b', name: 'B', type: 'String', required: true },
          { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
        ],
        outputs: [
          { id: 'result', name: 'Равны?', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:starts_with',
      label: '▶️ Начинается с',
      category: 'Строки',
      description: 'Проверяет, начинается ли строка с подстроки.',
      graphType: all,
      evaluator: require('./nodes/string_starts_with').evaluate,
      pins: {
        inputs: [
          { id: 'string', name: 'Строка', type: 'String', required: true },
          { id: 'prefix', name: 'Префикс', type: 'String', required: true },
          { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
        ],
        outputs: [
          { id: 'result', name: 'Начинается?', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:ends_with',
      label: '◀️ Заканчивается на',
      category: 'Строки',
      description: 'Проверяет, заканчивается ли строка подстрокой.',
      graphType: all,
      evaluator: require('./nodes/string_ends_with').evaluate,
      pins: {
        inputs: [
          { id: 'string', name: 'Строка', type: 'String', required: true },
          { id: 'suffix', name: 'Суффикс', type: 'String', required: true },
          { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
        ],
        outputs: [
          { id: 'result', name: 'Заканчивается?', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:length',
      label: '📏 Длина строки',
      category: 'Строки',
      description: 'Возвращает количество символов.',
      graphType: all,
      evaluator: require('./nodes/string_length').evaluate,
      pins: {
        inputs: [
          { id: 'string', name: 'Строка', type: 'String', required: true }
        ],
        outputs: [
          { id: 'length', name: 'Длина', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:split',
      label: '✂️ Разделить строку',
      category: 'Строки',
      description: 'Разделяет строку на массив по разделителю.',
      graphType: all,
      evaluator: require('./nodes/string_split').evaluate,
      pins: {
        inputs: [
          { id: 'string', name: 'Строка', type: 'String', required: true },
          { id: 'separator', name: 'Разделитель', type: 'String', required: true }
        ],
        outputs: [
          { id: 'array', name: 'Массив', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:concat',
      label: 'Строка: Объединить',
      category: 'Строки',
      description: 'Объединяет две или более строки в одну.',
      graphType: all,
      dynamicPins: true,
      evaluator: require('./nodes/string_concat').evaluate,
      pins: {
        inputs: [],
        outputs: [
          { id: 'result', name: 'Результат', type: 'String' }
        ]
      }
    });

    this.registerNodeType({
      type: 'math:operation',
      label: '🔢 Математика',
      category: 'Математика',
      description: 'Выполняет математическую операцию над двумя числами.',
      graphType: all,
      evaluator: require('./nodes/math_operation').evaluate,
      pins: {
        inputs: [
          { id: 'a', name: 'A', type: 'Number', required: true },
          { id: 'b', name: 'B', type: 'Number', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Результат', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'logic:operation',
      label: '💡 Логика',
      category: 'Логика',
      description: 'Выполняет логическую операцию. Для НЕ (NOT) используется только вход А.',
      graphType: all,
      dynamicPins: true,
      evaluator: require('./nodes/logic_operation').evaluate,
      pins: {
        inputs: [
          { id: 'a', name: 'A', type: 'Boolean', required: true },
          { id: 'b', name: 'B', type: 'Boolean', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Результат', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'debug:log',
      label: '🐞 Отладка (консоль)',
      category: 'Отладка',
      description: 'Выводит значение в консоль терминала, где запущен бот.',
      graphType: all,
      executor: require('./nodes/debug_log').execute,
      pins: {
        inputs: [
          { id: 'exec', name: 'Exec', type: 'Exec' },
          { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'exec', name: 'Exec', type: 'Exec' }
        ]
      }
    });

    this.registerNodeType({
      type: 'math:random_number',
      label: '🎲 Случайное число',
      category: 'Математика',
      graphType: 'all',
      description: 'Генерирует случайное число в заданном диапазоне.',
      evaluator: require('./nodes/math_random_number').evaluate,
      pins: {
        inputs: [
          { id: 'min', name: 'Мин', type: 'Number' },
          { id: 'max', name: 'Макс', type: 'Number' }
        ],
        outputs: [{ id: 'result', name: 'Результат', type: 'Number' }]
      }
    });

    this.registerNodeType({
      type: 'array:get_random_element',
      label: '🎲 Случайный элемент',
      category: 'Массив',
      graphType: 'all',
      description: 'Возвращает случайный элемент из массива и его индекс.',
      evaluator: require('./nodes/array_get_random_element').evaluate,
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true }
        ],
        outputs: [
          { id: 'element', name: 'Элемент', type: 'Any' },
          { id: 'index', name: 'Индекс', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:contains',
      label: '🔍 Массив: Содержит',
      category: 'Массив',
      description: 'Проверяет, содержит ли массив указанный элемент и возвращает его индекс.',
      graphType: all,
      evaluator: require('./nodes/array_contains').evaluate,
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true },
          { id: 'element', name: 'Элемент', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Найден', type: 'Boolean' },
          { id: 'index', name: 'Индекс', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:get_by_index',
      label: '📦 Элемент по индексу',
      category: 'Массив',
      description: 'Получает элемент массива по его индексу.',
      graphType: all,
      evaluator: require('./nodes/array_get_by_index').evaluate,
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true },
          { id: 'index', name: 'Индекс', type: 'Number', required: true }
        ],
        outputs: [
          { id: 'element', name: 'Элемент', type: 'Any' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:get_next',
      label: '➡️ Следующий элемент',
      category: 'Массив',
      description: 'Получает следующий элемент массива.',
      graphType: all,
      evaluator: require('./nodes/array_get_next').evaluate,
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true },
          { id: 'current_index', name: 'Текущий индекс', type: 'Number', required: true }
        ],
        outputs: [
          { id: 'next_element', name: 'Следующий элемент', type: 'Any' },
          { id: 'next_index', name: 'Следующий индекс', type: 'Number' },
          { id: 'has_next', name: 'Есть следующий?', type: 'Boolean', description: 'True, если следующий элемент существует' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:add_element',
      label: '➕ Добавить элемент',
      category: 'Массив',
      description: 'Добавляет элемент в конец массива.',
      graphType: all,
      evaluator: require('./nodes/array_add_element').evaluate,
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true },
          { id: 'element', name: 'Элемент', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Новый массив', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:remove_by_index',
      label: '➖ Удалить по индексу',
      category: 'Массив',
      description: 'Удаляет элемент из массива по его индексу.',
      graphType: all,
      evaluator: require('./nodes/array_remove_by_index').evaluate,
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true },
          { id: 'index', name: 'Индекс', type: 'Number', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Новый массив', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:find_index',
      label: '🔍 Найти индекс',
      category: 'Массив',
      description: 'Находит индекс элемента в массиве (или -1 если не найден).',
      graphType: all,
      evaluator: require('./nodes/array_find_index').evaluate,
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true },
          { id: 'element', name: 'Элемент', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'index', name: 'Индекс', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'object:create',
      label: '🏗️ Создать объект',
      category: 'Объект',
      description: 'Создает объект из пар ключ-значение.',
      graphType: all,
      dynamicPins: true,
      evaluator: require('./nodes/object_create').evaluate,
      pins: {
        inputs: [],
        outputs: [
          { id: 'object', name: 'Объект', type: 'Object' }
        ]
      }
    });

    this.registerNodeType({
      type: 'object:get',
      label: '📤 Получить значение',
      category: 'Объект',
      description: 'Получает значение по ключу из объекта.',
      graphType: all,
      evaluator: require('./nodes/object_get').evaluate,
      pins: {
        inputs: [
          { id: 'object', name: 'Объект', type: 'Object', required: true },
          { id: 'key', name: 'Ключ', type: 'String', required: true }
        ],
        outputs: [
          { id: 'value', name: 'Значение', type: 'Any' }
        ]
      }
    });

    this.registerNodeType({
      type: 'object:set',
      label: '➕ Добавить/Изменить ключ',
      category: 'Объект',
      description: 'Добавляет или изменяет значение по ключу в объекте.',
      graphType: all,
      evaluator: require('./nodes/object_set').evaluate,
      pins: {
        inputs: [
          { id: 'object', name: 'Объект', type: 'Object', required: true },
          { id: 'key', name: 'Ключ', type: 'String', required: true },
          { id: 'value', name: 'Значение', type: 'Any', required: true }
        ],
        outputs: [
          { id: 'new_object', name: 'Новый объект', type: 'Object' }
        ]
      }
    });

    this.registerNodeType({
      type: 'object:delete',
      label: '➖ Удалить ключ',
      category: 'Объект',
      description: 'Удаляет ключ из объекта.',
      graphType: all,
      evaluator: require('./nodes/object_delete').evaluate,
      pins: {
        inputs: [
          { id: 'object', name: 'Объект', type: 'Object', required: true },
          { id: 'key', name: 'Ключ', type: 'String', required: true }
        ],
        outputs: [
          { id: 'new_object', name: 'Новый объект', type: 'Object' }
        ]
      }
    });

    this.registerNodeType({
      type: 'object:has_key',
      label: '🔍 Проверить ключ',
      category: 'Объект',
      description: 'Проверяет наличие ключа в объекте и возвращает значение.',
      graphType: all,
      evaluator: require('./nodes/object_has_key').evaluate,
      pins: {
        inputs: [
          { id: 'object', name: 'Объект', type: 'Object', required: true },
          { id: 'key', name: 'Ключ', type: 'String', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Найден', type: 'Boolean' },
          { id: 'value', name: 'Значение', type: 'Any' }
        ]
      }
    });

      this.registerNodeType({
      type: 'data:get_server_players',
      label: '👥 Список игроков',
      category: 'Данные',
      graphType: 'all',
      description: 'Возвращает массив с именами всех игроков на сервере.',
      evaluator: require('./nodes/data_get_server_players').evaluate,
      pins: {
        inputs: [],
        outputs: [
          { id: 'players', name: 'Игроки', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'logic:compare',
      label: '⎗ Сравнение',
      category: 'Логика',
      description: 'Сравнивает два значения.',
      graphType: all,
      evaluator: require('./nodes/logic_compare').evaluate,
      pins: {
        inputs: [
          { id: 'a', name: 'A', type: 'Wildcard' },
          { id: 'b', name: 'B', type: 'Wildcard' }
        ],
        outputs: [
          { id: 'result', name: 'Результат', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'bot:get_position',
      label: '🤖 Позиция бота',
      category: 'Бот',
      description: 'Возвращает текущую позицию бота в мире.',
      graphType: all,
      evaluator: require('./nodes/bot_get_position').evaluate,
      pins: {
        inputs: [],
        outputs: [
          { id: 'position', name: 'Позиция', type: 'Object' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_nearby_entities',
      label: '👁️ Получить существ рядом',
      category: 'Данные',
      description: 'Возвращает массив существ в радиусе от бота.',
      graphType: all,
      evaluator: require('./nodes/data_get_nearby_entities').evaluate,
      pins: {
        inputs: [
          { id: 'radius', name: 'Радиус', type: 'Number', required: false }
        ],
        outputs: [
          { id: 'entities', name: 'Существа', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_nearby_players',
      label: '👥 Игроки рядом',
      category: 'Данные',
      description: 'Возвращает массив игроков с расстоянием.',
      graphType: all,
      evaluator: require('./nodes/data_get_nearby_players').evaluate,
      pins: {
        inputs: [
          { id: 'radius', name: 'Радиус', type: 'Number', required: false }
        ],
        outputs: [
          { id: 'players', name: 'Игроки', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:entity_info',
      label: '🔍 Информация о существе',
      category: 'Данные',
      description: 'Извлекает данные из объекта существа.',
      graphType: all,
      evaluator: require('./nodes/data_entity_info').evaluate,
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

    // Пользователи
    this.registerNodeType({
        type: 'user:check_blacklist',
        label: '❓ В черном списке?',
        category: 'Пользователи',
        description: 'Проверяет, находится ли пользователь в черном списке.',
        graphType: all,
        evaluator: require('./nodes/user_check_blacklist').evaluate,
        pins: {
            inputs: [
                { id: 'user', name: 'Пользователь', type: 'User', required: true }
            ],
            outputs: [
                { id: 'is_blacklisted', name: 'В ЧС', type: 'Boolean' }
            ]
        }
    });

    this.registerNodeType({
        type: 'user:set_blacklist',
        label: '🚫 Установить ЧС',
        category: 'Пользователи',
        description: 'Добавляет или убирает пользователя из черного списка.',
        graphType: all,
        executor: require('./nodes/user_set_blacklist').execute,
        pins: {
            inputs: [
                { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
                { id: 'user', name: 'Пользователь', type: 'User', required: true },
                { id: 'blacklist_status', name: 'Статус ЧС', type: 'Boolean', required: true }
            ],
            outputs: [
                { id: 'exec', name: 'Далее', type: 'Exec' },
                { id: 'updated_user', name: 'Обновленный пользователь', type: 'User' }
            ]
        }
    });
    

    this.registerNodeType({
      type: 'user:get_groups',
      label: '👥 Получить группы',
      category: 'Пользователь',
      description: 'Возвращает массив названий групп, в которых состоит пользователь.',
      graphType: all,
      evaluator: require('./nodes/user_get_groups').evaluate,
      pins: {
        inputs: [
          { id: 'user', name: 'Пользователь', type: 'User', required: true }
        ],
        outputs: [
          { id: 'groups', name: 'Группы', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'user:get_permissions',
      label: '🔑 Получить права',
      category: 'Пользователь',
      description: 'Возвращает массив прав пользователя.',
      graphType: all,
      evaluator: require('./nodes/user_get_permissions').evaluate,
      pins: {
        inputs: [
          { id: 'user', name: 'Пользователь', type: 'User', required: true }
        ],
        outputs: [
          { id: 'permissions', name: 'Права', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_user_field',
      label: '👤 Данные пользователя',
      category: 'Данные',
      description: 'Получает различные данные из объекта пользователя.',
      graphType: all,
      evaluator: require('./nodes/data_get_user_field').evaluate,
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

    this.registerNodeType({
      type: 'event:botDied',
      label: '💀 Бот умер',
      category: 'События',
      description: 'Срабатывает, когда бот умирает.',
      graphType: event,
      pins: {
        inputs: [],
        outputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec' },
        ]
      }
    });

    this.registerNodeType({
      type: 'event:health',
      label: '❤️ Здоровье/Голод изменилось',
      category: 'События',
      description: 'Срабатывает при изменении здоровья, голода или насыщения бота.',
      graphType: event,
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

    this.registerNodeType({
      type: 'event:websocket_call',
      label: '📡 Вызов из WebSocket API',
      category: 'События',
      description: 'Срабатывает, когда граф вызывается через WebSocket API методом callGraph().',
      graphType: event,
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

    this.registerNodeType({
      type: 'flow:switch',
      label: '🔄 Switch (свитч)',
      category: 'Поток',
      description: 'Выполняет разные действия в зависимости от значения. Автоматически определяет тип сравнения.',
      graphType: all,
      dynamicPins: true,
      executor: require('./nodes/flow_switch').execute,
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
          { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'default', name: 'Default', type: 'Exec' }
        ]
      }
    });

    console.log(`NodeRegistry: Registered ${this.nodes.size} base nodes`);
  }

  getNodesByTypes(types) {
    return types.map(type => this.nodes.get(type)).filter(Boolean);
  }
}

const nodeRegistryInstance = new NodeRegistry();
module.exports = nodeRegistryInstance;
