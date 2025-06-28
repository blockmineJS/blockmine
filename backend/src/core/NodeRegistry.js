/**
 * @typedef {object} NodePin
 * @property {string} id - Unique pin identifier (e.g., "exec", "data_result").
 * @property {string} name - Human-readable pin name.
 * @property {string} type - Pin data type ("Exec", "String", "Boolean", etc.).
 * @property {boolean} [required] - Whether this pin is required.
 */

/**
 * @typedef {object} NodeConfig
 * @property {string} type - Unique node type identifier (e.g., "action:send_message").
 * @property {string} label - Human-readable node name.
 * @property {string} category - Category for UI grouping.
 * @property {string} description - Node description.
 * @property {NodePin[]} inputs - Array of input pin descriptions.
 * @property {NodePin[]} outputs - Array of output pin descriptions.
 * @property {Function} [executor] - Function to execute this node (for backend).
 */

/**
 * Registry for managing all available node types.
 */
class NodeRegistry {
  constructor() {
    this.nodes = new Map();
    this._registerBaseNodes();
  }

  /**
   * Registers a new node type.
   * @param {NodeConfig} nodeConfig - Node configuration.
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
   * Gets a node configuration by type.
   * @param {string} nodeType - Node type identifier.
   * @returns {NodeConfig|undefined}
   */
  getNodeConfig(nodeType) {
    return this.nodes.get(nodeType);
  }

  /**
   * Gets all registered node types.
   * @returns {NodeConfig[]}
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Gets nodes grouped by category.
   * @param {string} [graphType] - The type of graph ('command' or 'event') to filter nodes for.
   * @returns {Object.<string, NodeConfig[]>}
   */
  getNodesByCategory(graphType) {
    const categories = {};
    for (const node of this.nodes.values()) {
      if (graphType === 'command') {
        if (node.category === 'События' && node.type !== 'event:command') {
          continue;
        }
      } else if (graphType === 'event') {
        if (node.type === 'event:command' || node.type === 'event:current_user') {
          continue;
        }
      }
      
      if (!categories[node.category]) {
        categories[node.category] = [];
      }
      categories[node.category].push(node);
    }

    // Очистка пустых категорий
    for (const categoryName in categories) {
      if (categories[categoryName].length === 0) {
        delete categories[categoryName];
      }
    }

    return categories;
  }

  /**
   * Validates if a node type exists.
   * @param {string} nodeType - Node type identifier.
   * @returns {boolean}
   */
  hasNodeType(nodeType) {
    return this.nodes.has(nodeType);
  }

  /**
   * Registers the base node library.
   * @private
   */
  _registerBaseNodes() {
    // События
    this.registerNodeType({
      type: 'event:command',
      label: '▶️ При выполнении команды',
      category: 'События',
      description: 'Стартовая точка для графа команды.',
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
      type: 'action:send_message',
      label: '🗣️ Отправить сообщение',
      category: 'Действия',
      description: 'Отправляет сообщение в чат',
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
      label: '📝 Отправить лог',
      category: 'Действия',
      description: 'Отправляет сообщение в лог-консоль бота на сайте',
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
          { id: 'message', name: 'Сообщение', type: 'String', required: true }
        ],
        outputs: [
          { id: 'exec', name: 'Выполнено', type: 'Exec' }
        ]
      }
    });

    this.registerNodeType({
      type: 'action:server_command',
      label: '⚙️ Выполнить команду сервера',
      category: 'Действия',
      description: 'Выполняет команду от имени бота',
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
          { id: 'command', name: 'Команда', type: 'String', required: true }
        ],
        outputs: [
          { id: 'exec', name: 'Выполнено', type: 'Exec' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_user',
      label: '👤 Получить пользователя',
      category: 'Данные',
      description: 'Находит пользователя по нику',
      pins: {
        inputs: [
          { id: 'username', name: 'Никнейм', type: 'String', required: true }
        ],
        outputs: [
          { id: 'user', name: 'Пользователь', type: 'User' },
          { id: 'found', name: 'Найден', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:check_permission',
      label: '✔️ Проверить права',
      category: 'Данные',
      description: 'Проверяет, есть ли у юзера право',
      pins: {
        inputs: [
          { id: 'user', name: 'Пользователь', type: 'User', required: true },
          { id: 'permission', name: 'Право', type: 'String', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Результат', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:concat_strings',
      label: '🔤 Объединить строки',
      category: 'Данные',
      description: 'Конкатенация двух строк',
      pins: {
        inputs: [
          { id: 'a', name: 'A', type: 'String', required: true },
          { id: 'b', name: 'B', type: 'String', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Результат', type: 'String' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_user_field',
      label: '📄 Получить поле из User',
      category: 'Данные',
      description: 'Деструктуризация объекта User',
      pins: {
        inputs: [
          { id: 'user', name: 'Пользователь', type: 'User', required: true }
        ],
        outputs: [
          { id: 'username', name: 'Никнейм', type: 'String' },
          { id: 'groups', name: 'Группы', type: 'Array' },
          { id: 'is_blacklisted', name: 'В ЧС?', type: 'Boolean' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_argument',
      label: '📝 Получить аргумент',
      category: 'Данные',
      description: 'Получает значение аргумента команды',
      pins: {
        inputs: [
          { id: 'args', name: 'Аргументы', type: 'Object', required: true },
          { id: 'arg_name', name: 'Имя аргумента', type: 'String', required: true }
        ],
        outputs: [
          { id: 'value', name: 'Значение', type: 'Wildcard' },
          { id: 'exists', name: 'Существует', type: 'Boolean' },
        ]
      }
    });

    this.registerNodeType({
      type: 'data:string_literal',
      label: '📝 Текст (String)',
      category: 'Данные',
      description: 'Создает текстовую константу',
      pins: {
        inputs: [],
        outputs: [
          { id: 'value', name: 'Значение', type: 'String' }
        ]
      }
    });

    this.registerNodeType({
        type: 'event:current_user',
        label: '👤 Текущий Пользователь',
        category: 'События',
        description: 'Предоставляет пользователя, выполнившего команду',
        pins: {
          inputs: [],
          outputs: [
              { id: 'user', name: 'Пользователь', type: 'User' }
          ]
        }
    });

    this.registerNodeType({
        type: 'string:contains',
        label: 'Содержит строку',
        category: 'Данные',
        description: 'Проверяет, содержит ли строка А строку Б',
        pins: {
          inputs: [
              { id: 'a', name: 'Входящая строка', type: 'String', required: true },
              { id: 'b', name: 'Include', type: 'String', required: true },
              { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
          ],
          outputs: [
              { id: 'result', name: 'Результат', type: 'Boolean' }
          ]
        }
    });

    this.registerNodeType({
        type: 'string:matches',
        label: 'Проверка по Regex',
        category: 'Данные',
        description: 'Проверяет строку по регулярному выражению',
        pins: {
          inputs: [
              { id: 'input', name: 'Строка', type: 'String', required: true },
              { id: 'regex', name: 'Regex', type: 'String', required: true }
          ],
          outputs: [
              { id: 'result', name: 'Результат', type: 'Boolean' }
          ]
        }
    });

    this.registerNodeType({
      type: 'variable:get',
      label: 'Получить переменную',
      category: 'Переменные',
      description: 'Получает значение переменной графа',
      pins: {
        inputs: [
          { id: 'name', name: 'Имя', type: 'String', required: true }
        ],
        outputs: [
          { id: 'value', name: 'Значение', type: 'Wildcard' }
        ]
      }
    });

    this.registerNodeType({
      type: 'variable:set',
      label: '🖊️ Установить переменную',
      category: 'Переменные',
      description: 'Устанавливает значение переменной графа',
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
      type: 'math:add',
      label: 'Сложение / Конкатенация',
      category: 'Математика',
      description: 'Складывает два числа или объединяет две строки',
      pins: {
        inputs: [
          { id: 'a', name: 'A', type: 'Wildcard', required: true },
          { id: 'b', name: 'B', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Результат', type: 'Wildcard' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:cast',
      label: 'Преобразовать тип',
      category: 'Данные',
      description: 'Преобразует входное значение в выбранный тип данных',
      pins: {
        inputs: [
          { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'result', name: 'Результат', type: 'Wildcard' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_server_players',
      label: '👥 Игроки на сервере',
      category: 'Данные',
      description: 'Возвращает массив никнеймов всех игроков на сервере.',
      pins: {
        inputs: [],
        outputs: [
          { id: 'players', name: 'Игроки', type: 'Array' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:get_random_element',
      label: '🔀 Случайный элемент',
      category: 'Массив',
      description: 'Возвращает случайный элемент из массива. Возвращает null, если массив пуст.',
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true }
        ],
        outputs: [
          { id: 'element', name: 'Элемент', type: 'Wildcard' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:add_element',
      label: '➕ Добавить элемент',
      category: 'Массив',
      description: 'Добавляет элемент в конец массива и возвращает новый массив.',
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
      description: 'Удаляет элемент из массива по указанному индексу и возвращает новый массив.',
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
      type: 'array:get_by_index',
      label: '📄 Получить по индексу',
      category: 'Массив',
      description: 'Получает элемент из массива по указанному индексу.',
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true },
          { id: 'index', name: 'Индекс', type: 'Number', required: true }
        ],
        outputs: [
          { id: 'element', name: 'Элемент', type: 'Wildcard' }
        ]
      }
    });

    this.registerNodeType({
      type: 'array:find_index',
      label: '🔍 Найти индекс элемента',
      category: 'Массив',
      description: 'Находит индекс первого вхождения элемента в массиве. Возвращает -1, если элемент не найден.',
      pins: {
        inputs: [
          { id: 'array', name: 'Массив', type: 'Array', required: true },
          { id: 'element', name: 'Элемент для поиска', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'index', name: 'Индекс', type: 'Number' }
        ]
      }
    });

    this.registerNodeType({
      type: 'action:bot_look_at',
      label: '👁️ Посмотреть на точку/сущность',
      category: 'Действия',
      description: 'Поворачивает взгляд бота в сторону указанной позиции или сущности. Можно добавить смещение по высоте.',
      pins: {
        inputs: [
          { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
          // --- НАЧАЛО ИЗМЕНЕНИЙ ---
          { id: 'target', name: 'Цель (Позиция/Сущность)', type: 'Object', required: true },
          { id: 'add_y', name: 'Прибавить к Y', type: 'Number', required: false } // Новый, понятный пин
          // --- КОНЕЦ ИЗМЕНЕНИЙ ---
        ],
        outputs: [
          { id: 'exec', name: 'Выполнено', type: 'Exec' }
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_bot_look',
      label: '👁️ Получить взгляд бота',
      category: 'Данные',
      description: 'Возвращает текущий горизонтальный (yaw) и вертикальный (pitch) угол взгляда бота в радианах.',
      pins: {
        inputs: [],
        outputs: [
          { id: 'yaw', name: 'Yaw', type: 'Number' },
          { id: 'pitch', name: 'Pitch', type: 'Number' },
        ]
      }
    });

    this.registerNodeType({
      type: 'data:get_entity_field',
      label: '📄 Получить поле из Entity',
      category: 'Данные',
      description: 'Извлекает данные из объекта сущности.',
      pins: {
        inputs: [
          { id: 'entity', name: 'Сущность', type: 'Object', required: true }
        ],
        outputs: [
          { id: 'username', name: 'Никнейм', type: 'String' },
          { id: 'type', name: 'Тип', type: 'String' },
          { id: 'position', name: 'Позиция', type: 'Object' },
          { id: 'isValid', name: 'Валидна', type: 'Boolean' },
        ]
      }
    });

    console.log(`NodeRegistry: Registered ${this.nodes.size} base nodes`);
  }
}

const nodeRegistryInstance = new NodeRegistry();
module.exports = nodeRegistryInstance;
