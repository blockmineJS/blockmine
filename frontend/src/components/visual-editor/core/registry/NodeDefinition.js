/**
 * NodeDefinition - определение типа ноды
 *
 * Описывает структуру и поведение конкретного типа ноды.
 */

export class NodeDefinition {
  /**
   * @param {Object} config - конфигурация ноды
   * @param {string} config.type - уникальный тип ноды (например, 'data:cast')
   * @param {string} config.category - категория ноды (data, flow, action, etc)
   * @param {string} config.label - отображаемое имя ноды
   * @param {string} [config.description] - описание ноды
   * @param {Function} [config.computeInputs] - функция для вычисления входных пинов
   * @param {Function} [config.computeOutputs] - функция для вычисления выходных пинов
   * @param {React.Component} [config.SettingsComponent] - компонент настроек
   * @param {Object} [config.defaultData] - данные по умолчанию
   * @param {Object} [config.theme] - настройки темы
   */
  constructor({
    type,
    category,
    label,
    description = '',
    computeInputs = null,
    computeOutputs = null,
    SettingsComponent = null,
    defaultData = {},
    theme = {},
  }) {
    this.type = type;
    this.category = category;
    this.label = label;
    this.description = description;
    this.computeInputs = computeInputs;
    this.computeOutputs = computeOutputs;
    this.SettingsComponent = SettingsComponent;
    this.defaultData = defaultData;
    this.theme = theme;
  }

  /**
   * Получает входные пины для данной ноды
   * @param {Object} data - данные ноды
   * @param {Object} context - контекст (variables, commandArguments, etc)
   * @returns {Array} массив пинов
   */
  getInputs(data, context = {}) {
    if (this.computeInputs) {
      return this.computeInputs(data, context);
    }
    return [];
  }

  /**
   * Получает выходные пины для данной ноды
   * @param {Object} data - данные ноды
   * @param {Object} context - контекст
   * @returns {Array} массив пинов
   */
  getOutputs(data, context = {}) {
    if (this.computeOutputs) {
      return this.computeOutputs(data, context);
    }
    return [];
  }

  /**
   * Проверяет, имеет ли нода компонент настроек
   * @returns {boolean}
   */
  hasSettings() {
    return this.SettingsComponent !== null;
  }

  /**
   * Получает данные по умолчанию
   * @returns {Object}
   */
  getDefaultData() {
    return { ...this.defaultData };
  }

  /**
   * Получает тему ноды
   * @returns {Object}
   */
  getTheme() {
    return { ...this.theme };
  }
}

export default NodeDefinition;
