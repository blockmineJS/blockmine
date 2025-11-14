const validationService = require('./services/ValidationService');

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

    const validation = validationService.validateNode(nodeConfig, 'NodeRegistry');
    if (validation.shouldSkip) {
      return;
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
    // Импортируем модули регистрации нод
    const eventsRegistry = require('./node-registries/events');
    const flowRegistry = require('./node-registries/flow');
    const actionsRegistry = require('./node-registries/actions');
    const dataRegistry = require('./node-registries/data');
    const timeRegistry = require('./node-registries/time');
    const stringsRegistry = require('./node-registries/strings');
    const arraysRegistry = require('./node-registries/arrays');
    const mathRegistry = require('./node-registries/math');
    const logicRegistry = require('./node-registries/logic');
    const objectsRegistry = require('./node-registries/objects');
    const usersRegistry = require('./node-registries/users');
    const botRegistry = require('./node-registries/bot');
    const debugRegistry = require('./node-registries/debug');

    // Регистрируем все ноды
    eventsRegistry.registerNodes(this);
    flowRegistry.registerNodes(this);
    actionsRegistry.registerNodes(this);
    dataRegistry.registerNodes(this);
    timeRegistry.registerNodes(this);
    stringsRegistry.registerNodes(this);
    arraysRegistry.registerNodes(this);
    mathRegistry.registerNodes(this);
    logicRegistry.registerNodes(this);
    objectsRegistry.registerNodes(this);
    usersRegistry.registerNodes(this);
    botRegistry.registerNodes(this);
    debugRegistry.registerNodes(this);

    console.log(`NodeRegistry: Registered ${this.nodes.size} base nodes`);
  }

  getNodesByTypes(types) {
    return types.map(type => this.nodes.get(type)).filter(Boolean);
  }
}

const nodeRegistryInstance = new NodeRegistry();
module.exports = nodeRegistryInstance;
