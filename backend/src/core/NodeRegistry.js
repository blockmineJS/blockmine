const validationService = require('./services/ValidationService');
const { GRAPH_TYPES } = require('./constants/graphTypes');

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
      if (node.graphType === GRAPH_TYPES.ALL || node.graphType === graphType) {
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
   * Автоматически обнаруживает и загружает все файлы из директории node-registries.
   * @private
   */
  _registerBaseNodes() {
    const fs = require('fs');
    const path = require('path');

    const registriesDir = path.join(__dirname, 'node-registries');

    try {
      // Получаем все файлы .js из директории node-registries
      const files = fs.readdirSync(registriesDir)
        .filter(file => file.endsWith('.js'));

      // Загружаем и регистрируем ноды из каждого файла
      for (const file of files) {
        try {
          const registry = require(path.join(registriesDir, file));

          if (typeof registry.registerNodes === 'function') {
            registry.registerNodes(this);
          } else {
            console.warn(`NodeRegistry: Файл ${file} не экспортирует функцию registerNodes`);
          }
        } catch (error) {
          console.error(`NodeRegistry: Ошибка загрузки реестра из ${file}:`, error.message);
        }
      }

      console.log(`NodeRegistry: Registered ${this.nodes.size} base nodes from ${files.length} registries`);
    } catch (error) {
      console.error('NodeRegistry: Ошибка чтения директории node-registries:', error.message);
    }
  }

  getNodesByTypes(types) {
    return types.map(type => this.nodes.get(type)).filter(Boolean);
  }
}

const nodeRegistryInstance = new NodeRegistry();
module.exports = nodeRegistryInstance;
