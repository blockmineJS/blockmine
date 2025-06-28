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
   * @returns {Object.<string, NodeConfig[]>}
   */
  getNodesByCategory() {
    const categories = {};
    for (const node of this.nodes.values()) {
      if (!categories[node.category]) {
        categories[node.category] = [];
      }
      categories[node.category].push(node);
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
    this.registerNodeType({
      type: 'event:command',
      label: '▶️ При выполнении команды',
      category: 'События',
      description: 'Стартовая точка графа',
      inputs: [],
      outputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec' },
        { id: 'user', name: 'Пользователь', type: 'User' },
        { id: 'args', name: 'Аргументы', type: 'Object' },
        { id: 'chat_type', name: 'Тип чата', type: 'String' }
      ]
    });

    this.registerNodeType({
      type: 'flow:branch',
      label: '↔️ Ветвление (Branch)',
      category: 'Поток',
      description: 'if/else логика',
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'condition', name: 'Условие', type: 'Boolean', required: true }
      ],
      outputs: [
        { id: 'exec_true', name: 'True', type: 'Exec' },
        { id: 'exec_false', name: 'False', type: 'Exec' }
      ]
    });

    this.registerNodeType({
      type: 'flow:sequence',
      label: '⛓️ Последовательность',
      category: 'Поток',
      description: 'Выполняет действия по очереди',
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true }
      ],
      outputs: [
        { id: 'exec_0', name: '0', type: 'Exec' },
        { id: 'exec_1', name: '1', type: 'Exec' },
        { id: 'exec_2', name: '2', type: 'Exec' },
        { id: 'exec_3', name: '3', type: 'Exec' }
      ]
    });

    this.registerNodeType({
      type: 'action:send_message',
      label: '🗣️ Отправить сообщение',
      category: 'Действия',
      description: 'Отправляет сообщение в чат',
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'chat_type', name: 'Тип чата', type: 'String', required: true },
        { id: 'message', name: 'Сообщение', type: 'String', required: true },
        { id: 'recipient', name: 'Адресат', type: 'String', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' }
      ]
    });

    this.registerNodeType({
      type: 'action:server_command',
      label: '⚙️ Выполнить команду сервера',
      category: 'Действия',
      description: 'Выполняет команду от имени бота',
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'command', name: 'Команда', type: 'String', required: true }
      ],
      outputs: [
        { id: 'exec', name: 'Выполнено', type: 'Exec' }
      ]
    });

    this.registerNodeType({
      type: 'data:get_user',
      label: '👤 Получить пользователя',
      category: 'Данные',
      description: 'Находит пользователя по нику',
      inputs: [
        { id: 'username', name: 'Никнейм', type: 'String', required: true }
      ],
      outputs: [
        { id: 'user', name: 'Пользователь', type: 'User' },
        { id: 'found', name: 'Найден', type: 'Boolean' }
      ]
    });

    this.registerNodeType({
      type: 'data:check_permission',
      label: '✔️ Проверить права',
      category: 'Данные',
      description: 'Проверяет, есть ли у юзера право',
      inputs: [
        { id: 'user', name: 'Пользователь', type: 'User', required: true },
        { id: 'permission', name: 'Право', type: 'String', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Результат', type: 'Boolean' }
      ]
    });

    this.registerNodeType({
      type: 'data:concat_strings',
      label: '🔤 Объединить строки',
      category: 'Данные',
      description: 'Конкатенация двух строк',
      inputs: [
        { id: 'a', name: 'A', type: 'String', required: true },
        { id: 'b', name: 'B', type: 'String', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Результат', type: 'String' }
      ]
    });

    this.registerNodeType({
      type: 'data:get_user_field',
      label: '📄 Получить поле из User',
      category: 'Данные',
      description: 'Деструктуризация объекта User',
      inputs: [
        { id: 'user', name: 'Пользователь', type: 'User', required: true }
      ],
      outputs: [
        { id: 'username', name: 'Никнейм', type: 'String' },
        { id: 'groups', name: 'Группы', type: 'Array' },
        { id: 'is_blacklisted', name: 'В ЧС?', type: 'Boolean' }
      ]
    });

    this.registerNodeType({
      type: 'data:get_argument',
      label: '📝 Получить аргумент',
      category: 'Данные',
      description: 'Получает значение аргумента команды',
      inputs: [
        { id: 'args', name: 'Аргументы', type: 'Object', required: true },
        { id: 'arg_name', name: 'Имя аргумента', type: 'String', required: true }
      ],
      outputs: [
        { id: 'value', name: 'Значение', type: 'Wildcard' },
        { id: 'exists', name: 'Существует', type: 'Boolean' },
      ]
    });

    this.registerNodeType({
      type: 'data:string_literal',
      label: '📝 Текст (String)',
      category: 'Данные',
      description: 'Создает текстовую константу',
      inputs: [],
      outputs: [
        { id: 'value', name: 'Значение', type: 'String' }
      ]
    });



    this.registerNodeType({
        type: 'event:current_user',
        label: '👤 Текущий Пользователь',
        category: 'События',
        description: 'Предоставляет пользователя, выполнившего команду',
        inputs: [],
        outputs: [
            { id: 'user', name: 'Пользователь', type: 'User' }
        ]
    });

    console.log(`NodeRegistry: Registered ${this.nodes.size} base nodes`);
  }
}

module.exports = NodeRegistry;
