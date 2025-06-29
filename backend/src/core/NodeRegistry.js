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
      graphType: event,
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
      description: 'Получает значение аргумента команды.',
      graphType: command,
      pins: {
        inputs: [
          { id: 'arg_name', name: 'Имя аргумента', type: 'String', required: true },
        ],
        outputs: [
          { id: 'value', name: 'Значение', type: 'Wildcard' },
          { id: 'exists', name: 'Существует', type: 'Boolean' },
        ]
      }
    });

    this.registerNodeType({
        type: 'data:get_variable',
        label: '📤 Получить переменную',
        category: 'Данные',
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
      description: 'Преобразует значение из одного типа в другой.',
      graphType: all,
      pins: {
        inputs: [
          { id: 'exec_in', name: 'Exec', type: 'Exec' },
          { id: 'value', name: 'Значение', type: 'Wildcard', required: true },
          { id: 'target_type', name: 'Целевой тип', type: 'String', required: true }
        ],
        outputs: [
          { id: 'exec_out', name: 'Exec', type: 'Exec' },
          { id: 'value', name: 'Значение', type: 'Wildcard' }
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
          { id: 'exec_in', name: 'Exec', type: 'Exec' },
          { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
        ],
        outputs: [
          { id: 'exec_out', name: 'Exec', type: 'Exec' }
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
