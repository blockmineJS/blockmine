/**
 * Базовый класс для определения ноды в визуальном редакторе.
 * Используется как единый формат для всех нод - и backend и frontend.
 */
class NodeDefinition {
  constructor(config) {
    this.type = config.type;
    this.category = config.category || 'Other';
    this.label = config.label || config.type;
    this.description = config.description || '';

    // Функции для вычисления пинов динамически (поддержка conditional pins)
    this.computeInputs = config.computeInputs || (() => []);
    this.computeOutputs = config.computeOutputs || (() => []);

    // Статичные пиньи (fallback для обратной совместимости)
    this.pins = config.pins || { inputs: [], outputs: [] };

    // Исполнители ноды
    // executor - для action нод с exec пинами (асинхронный)
    // evaluator - для data пинов (вычисление значений)
    this.executor = config.executor || null;
    this.evaluator = config.evaluator || null;

    // Метаданные ноды
    this.defaultData = config.defaultData || {};
    this.theme = config.theme || {};
    this.icon = config.icon || null;
    this.graphType = config.graphType || 'ALL'; // 'COMMAND', 'EVENT', 'ALL'

    // Валидация
    if (!this.type) {
      throw new Error('NodeDefinition: type is required');
    }
  }

  /**
   * Получить входные пиньи для данного состояния ноды
   * @param {object} data - данные ноды (для условных пиннов)
   * @returns {Array} массив описаний входных пиннов
   */
  getInputs(data = {}) {
    if (typeof this.computeInputs === 'function') {
      return this.computeInputs(data);
    }
    return this.pins.inputs || [];
  }

  /**
   * Получить выходные пиньи для данного состояния ноды
   * @param {object} data - данные ноды (для условных пиннов)
   * @returns {Array} массив описаний выходных пиннов
   */
  getOutputs(data = {}) {
    if (typeof this.computeOutputs === 'function') {
      return this.computeOutputs(data);
    }
    return this.pins.outputs || [];
  }

  /**
   * Проверить, является ли нода action-нодой (с exec пинами)
   */
  isActionNode() {
    const inputs = this.getInputs();
    return inputs.some(pin => pin.type === 'Exec');
  }

  /**
   * Проверить, является ли нода data-нодой (только вычисляемые значения)
   */
  isDataNode() {
    return !this.isActionNode();
  }

  /**
   * Проверить, есть ли у ноды executor
   */
  hasExecutor() {
    return typeof this.executor === 'function';
  }

  /**
   * Проверить, есть ли у ноды evaluator
   */
  hasEvaluator() {
    return typeof this.evaluator === 'function';
  }

  /**
   * Конвертировать в JSON-сериализуемый формат
   * Используется для отправки в frontend
   */
  toJSON() {
    return {
      type: this.type,
      category: this.category,
      label: this.label,
      description: this.description,
      pins: {
        inputs: this.pins.inputs || [],
        outputs: this.pins.outputs || []
      },
      defaultData: this.defaultData,
      theme: this.theme,
      icon: this.icon,
      graphType: this.graphType,
      isActionNode: this.isActionNode()
    };
  }

  /**
   * Получить пин по ID
   * @param {string} pinId - ID пина
   * @param {string} direction - 'input' или 'output'
   */
  getPin(pinId, direction) {
    const pins = direction === 'input' ? this.pins.inputs : this.pins.outputs;
    return pins.find(pin => pin.id === pinId);
  }

  /**
   * Проверить, является ли пин обязательным
   */
  isPinRequired(pinId, direction = 'input') {
    const pin = this.getPin(pinId, direction);
    return pin?.required === true;
  }
}

/**
 * Создать определение ноды с билдером
 */
function createNodeDefinition(config) {
  return new NodeDefinition(config);
}

module.exports = { NodeDefinition, createNodeDefinition };