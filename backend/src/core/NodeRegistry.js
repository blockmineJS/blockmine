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
    console.log(`Registered node type: ${nodeConfig.type}`);
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
      graphType: command,
      pins: {
        inputs: [],
        outputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec' },
          { id: 'user', name: 'Пользователь', type: 'User' },
          { id: 'args', name: 'Аргументы', type: 'Object' },
          { id: 'chat_type', name: 'Тип чата', type: 'String' }
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
                { id: 'raw', type: 'String', name: 'Raw JSON' },
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
      type: 'flow:break',
      label: '🛑 Выйти из цикла',
      category: 'Поток',
      description: 'Немедленно прерывает выполнение цикла (For Each Loop) и передает управление на его выход Completed.',
      graphType: all,
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
      description: 'Отправляет сообщение в чат',
      graphType: all,
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
      type: 'action:bot_look_at',
      label: '🤖 Бот: Посмотреть на',
      category: 'Действия',
      description: 'Поворачивает голову бота в сторону координат или сущности.',
      graphType: all,
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
      type: 'data:get_argument',
      label: '📥 Получить аргумент',
      category: 'Данные',
      description: 'Получает значение аргумента команды по его имени.',
      graphType: command,
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
      description: 'Простое текстовое значение.',
      graphType: all,
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
      category: 'Данные',
      description: 'Создает массив из элементов.',
      graphType: all,
      dynamicPins: true,
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
      type: 'data:length',
      label: '📏 Размер (длина)',
      category: 'Данные',
      graphType: 'all',
      description: 'Возвращает количество элементов в массиве или длину строки.',
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
      label: '🔍 Строка: Содержит',
      category: 'Строки',
      description: 'Проверяет, содержит ли одна строка другую.',
      graphType: all,
      pins: {
        inputs: [
          { id: 'exec', name: 'Exec', type: 'Exec', required: true },
          { id: 'haystack', name: 'Строка', type: 'String', required: true },
          { id: 'needle', name: 'Подстрока', type: 'String', required: true },
          { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
        ],
        outputs: [
          { id: 'exec', name: 'Exec', type: 'Exec' },
          { id: 'result', name: 'Результат', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:equals',
      label: 'Строка: Равно',
      category: 'Строки',
      description: 'Проверяет, равны ли строки (с учетом/без учета регистра).',
      graphType: all,
      pins: {
        inputs: [
          { id: 'exec', name: 'Exec', type: 'Exec', required: true },
          { id: 'a', name: 'A', type: 'String', required: true },
          { id: 'b', name: 'B', type: 'String', required: true },
          { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
        ],
        outputs: [
          { id: 'exec', name: 'Exec', type: 'Exec' },
          { id: 'result', name: 'Результат', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:starts_with',
      label: 'Строка: Начинается с',
      category: 'Строки',
      description: 'Проверяет, начинается ли строка с указанной подстроки.',
      graphType: all,
      pins: {
        inputs: [
          { id: 'exec', name: 'Exec', type: 'Exec', required: true },
          { id: 'string', name: 'Строка', type: 'String', required: true },
          { id: 'prefix', name: 'Префикс', type: 'String', required: true },
          { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
        ],
        outputs: [
          { id: 'exec', name: 'Exec', type: 'Exec' },
          { id: 'result', name: 'Результат', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:ends_with',
      label: 'Строка: Заканчивается на',
      category: 'Строки',
      description: 'Проверяет, заканчивается ли строка указанной подстрокой.',
      graphType: all,
      pins: {
        inputs: [
          { id: 'exec', name: 'Exec', type: 'Exec', required: true },
          { id: 'string', name: 'Строка', type: 'String', required: true },
          { id: 'suffix', name: 'Суффикс', type: 'String', required: true },
          { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
        ],
        outputs: [
          { id: 'exec', name: 'Exec', type: 'Exec' },
          { id: 'result', name: 'Результат', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:length',
      label: 'Строка: Длина',
      category: 'Строки',
      description: 'Возвращает количество символов в строке.',
      graphType: all,
      pins: {
        inputs: [
          { id: 'exec', name: 'Exec', type: 'Exec', required: true },
          { id: 'string', name: 'Строка', type: 'String', required: true }
        ],
        outputs: [
          { id: 'exec', name: 'Exec', type: 'Exec' },
          { id: 'length', name: 'Длина', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'string:split',
      label: 'Строка: Разделить',
      category: 'Строки',
      description: 'Разделяет строку на массив подстрок по разделителю.',
      graphType: all,
      pins: {
        inputs: [
          { id: 'exec', name: 'Exec', type: 'Exec', required: true },
          { id: 'string', name: 'Строка', type: 'String', required: true },
          { id: 'separator', name: 'Разделитель', type: 'String', required: true }
        ],
        outputs: [
          { id: 'exec', name: 'Exec', type: 'Exec' },
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
      category: 'Данные',
      graphType: 'all',
      description: 'Возвращает случайный элемент из массива и его индекс.',
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
      type: 'data:get_server_players',
      label: '👥 Список игроков',
      category: 'Данные',
      graphType: 'all',
      description: 'Возвращает массив с именами всех игроков на сервере.',
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
      pins: {
        inputs: [],
        outputs: [
          { id: 'position', name: 'Позиция', type: 'Object' }
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
    
    // Переменные
    this.registerNodeType({
      type: 'variable:get',
      label: '📤 Получить переменную',
      category: 'Переменные',
      description: 'Получает значение переменной графа.',
      graphType: event,
      pins: {
          inputs: [],
          outputs: [
              { id: 'value', name: 'Значение', type: 'Wildcard' }
          ]
      }
    });

    this.registerNodeType({
      type: 'user:get_groups',
      label: '👥 Получить группы',
      category: 'Пользователь',
      description: 'Возвращает массив названий групп, в которых состоит пользователь.',
      graphType: all,
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

    console.log(`NodeRegistry: Registered ${this.nodes.size} base nodes`);
  }

  getNodesByTypes(types) {
    return types.map(type => this.nodes.get(type)).filter(Boolean);
  }
}

const nodeRegistryInstance = new NodeRegistry();
module.exports = nodeRegistryInstance;
