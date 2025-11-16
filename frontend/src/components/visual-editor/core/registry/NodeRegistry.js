/**
 * NodeRegistry - централизованный реестр типов нод
 *
 * Управляет регистрацией, поиском и получением определений нод.
 * Каждый тип ноды регистрируется с помощью NodeDefinition.
 */

class NodeRegistry {
  constructor() {
    this.definitions = new Map();
    this.categories = new Map();
  }

  /**
   * Регистрирует определение ноды
   * @param {NodeDefinition} definition - определение ноды
   */
  register(definition) {
    if (!definition.type) {
      throw new Error('NodeDefinition must have a type');
    }

    if (this.definitions.has(definition.type)) {
      console.warn(`NodeDefinition with type "${definition.type}" already registered. Overwriting.`);
    }

    this.definitions.set(definition.type, definition);

    if (!this.categories.has(definition.category)) {
      this.categories.set(definition.category, []);
    }
    this.categories.get(definition.category).push(definition);

    return this;
  }

  /**
   * Регистрирует несколько определений
   * @param {NodeDefinition[]} definitions - массив определений
   */
  registerAll(definitions) {
    definitions.forEach(def => this.register(def));
    return this;
  }

  /**
   * Получает определение по типу
   * @param {string} type - тип ноды
   * @returns {NodeDefinition|undefined}
   */
  get(type) {
    return this.definitions.get(type);
  }

  /**
   * Проверяет существование типа
   * @param {string} type - тип ноды
   * @returns {boolean}
   */
  has(type) {
    return this.definitions.has(type);
  }

  /**
   * Получает все определения категории
   * @param {string} category - категория нод
   * @returns {NodeDefinition[]}
   */
  getByCategory(category) {
    return this.categories.get(category) || [];
  }

  /**
   * Получает все категории
   * @returns {string[]}
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * Получает все определения
   * @returns {NodeDefinition[]}
   */
  getAll() {
    return Array.from(this.definitions.values());
  }

  /**
   * Очищает реестр
   */
  clear() {
    this.definitions.clear();
    this.categories.clear();
  }

  /**
   * Получает количество зарегистрированных нод
   * @returns {number}
   */
  size() {
    return this.definitions.size;
  }
}

// Singleton instance
const registry = new NodeRegistry();

export default registry;
export { NodeRegistry };
