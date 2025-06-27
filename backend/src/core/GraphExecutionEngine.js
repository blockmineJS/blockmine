/**
 * Движок для выполнения визуальных команд, представленных в виде графа.
 */
class GraphExecutionEngine {
  /**
   * @param {import('./NodeRegistry')} nodeRegistry - Реестр всех доступных типов нод.
   */
  constructor(nodeRegistry) {
    if (!nodeRegistry) {
      throw new Error('GraphExecutionEngine requires a NodeRegistry instance.');
    }
    this.nodeRegistry = nodeRegistry;
    this.activeGraph = null;
    this.context = null;
    this.memo = new Map(); // Для кэширования результатов нод данных
  }

  /**
   * Выполняет граф.
   * @param {string} graphJson - JSON-строка графа.
   * @param {object} context - Контекст выполнения (bot, user, args, typeChat).
   */
  async execute(graphJson, context) {
    if (!graphJson || graphJson === 'null') return;

    console.log('--- Запуск выполнения визуальной команды ---');
    try {
      this.activeGraph = JSON.parse(graphJson);
      this.context = context;
      this.memo.clear(); // Очищаем кэш для нового запуска

      const startNode = this.activeGraph.nodes.find(n => n.type === 'event:command');
      if (!startNode) {
        throw new Error('Не найдена стартовая нода (event:command) в графе.');
      }

      // Начинаем выполнение с выходного пина 'exec' стартовой ноды
      await this.traverse(startNode, 'exec');
      console.log('--- Выполнение визуальной команды завершено ---');

    } catch (error) {
      console.error('[GraphExecutionEngine] Критическая ошибка выполнения графа:', error);
      this.context.bot.sendMessage(this.context.typeChat, `Ошибка в логике команды: ${error.message}`, this.context.user.username);
    }
  }

  /**
   * Рекурсивно обходит ветку выполнения (белые пины).
   * @param {object} node - Текущая нода.
   * @param {string} fromPinId - ID выходного пина, с которого начался переход.
   */
  async traverse(node, fromPinId) {
    const connection = this.activeGraph.connections.find(c => c.sourceNodeId === node.id && c.sourcePinId === fromPinId);
    if (!connection) return; // Конец ветки выполнения

    const nextNode = this.activeGraph.nodes.find(n => n.id === connection.targetNodeId);
    if (!nextNode) return;

    // Выполняем логику следующей ноды
    const resultPin = await this.executeNode(nextNode);

    // Если у ноды есть выходные пины выполнения, продолжаем обход
    if (resultPin) {
      await this.traverse(nextNode, resultPin);
    }
  }

  /**
   * Выполняет одну ноду.
   * @param {object} node - Нода для выполнения.
   * @returns {Promise<string|null>} ID выходного пина выполнения для продолжения обхода.
   */
  async executeNode(node) {
    console.log(`[Graph] Выполнение ноды: ${node.type} (ID: ${node.id})`);
    const nodeConfig = this.nodeRegistry.getNodeConfig(node.type);
    if (!nodeConfig) throw new Error(`Неизвестный тип ноды: ${node.type}`);

    // ЗАГЛУШКА: Здесь будет логика для всех нод. Пока реализуем только send_message.
    switch (node.type) {
      case 'action:send_message': {
        const message = await this.resolvePinValue(node, 'message', '');
        const chatType = await this.resolvePinValue(node, 'chat_type', this.context.typeChat);
        const recipient = await this.resolvePinValue(node, 'recipient', this.context.user.username);
        
        this.context.bot.sendMessage(chatType, message, recipient);

        // Возвращаем ID стандартного выходного пина, чтобы traverse знал, куда идти дальше
        return 'exec'; 
      }
      // Другие ноды будут добавлены здесь
      default:
        console.warn(`Логика для ноды ${node.type} еще не реализована.`);
        // Для нод потока (branch, sequence) здесь будет более сложная логика.
        const execOutput = nodeConfig.outputs.find(p => p.type === 'Exec');
        return execOutput ? execOutput.id : null;
    }
  }

  /**
   * Вычисляет значение на входном пине данных.
   * @param {object} node - Нода, для которой вычисляется значение.
   * @param {string} pinId - ID входного пина.
   * @param {*} defaultValue - Значение по умолчанию.
   * @returns {Promise<*>} Вычисленное значение.
   */
  async resolvePinValue(node, pinId, defaultValue) {
    // 1. Проверяем, есть ли статическое значение, заданное в самом узле
    if (node.data && node.data[pinId] !== undefined) {
      return node.data[pinId];
    }

    // 2. Проверяем, есть ли входящее соединение к этому пину
    const connection = this.activeGraph.connections.find(c => c.targetNodeId === node.id && c.targetPinId === pinId);
    if (connection) {
      const sourceNode = this.activeGraph.nodes.find(n => n.id === connection.sourceNodeId);
      if (!sourceNode) return defaultValue;

      // 3. Рекурсивно вычисляем значение из источника
      return await this.evaluateOutputPin(sourceNode, connection.sourcePinId);
    }
    
    return defaultValue;
  }

  /**
   * Вычисляет значение на выходном пине данных.
   * @param {object} node - Нода-источник.
   * @param {string} pinId - ID выходного пина.
   * @returns {Promise<*>} Значение.
   */
  async evaluateOutputPin(node, pinId) {
    // Проверяем кэш
    const cacheKey = `${node.id}:${pinId}`;
    if (this.memo.has(cacheKey)) return this.memo.get(cacheKey);

    let result;
    // ЗАГЛУШКА: Здесь будет логика для всех нод данных. Пока реализуем только event:command.
    switch (node.type) {
      case 'event:command':
      case 'event:current_user':
        if (pinId === 'user') result = this.context.user;
        else if (pinId === 'args') result = this.context.args;
        else if (pinId === 'chat_type') result = this.context.typeChat;
        else result = null;
        break;
      case 'data:string_literal':
        result = node.data.value || '';
        break;
      // Другие ноды данных будут здесь
      default:
        result = null;
        break;
    }

    this.memo.set(cacheKey, result); // Кэшируем результат
    return result;
  }
}

module.exports = GraphExecutionEngine;

