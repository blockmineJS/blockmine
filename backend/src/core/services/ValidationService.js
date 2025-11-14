const { validateGraph, validateNodeConfig } = require('../validation/nodeSchemas');
const { safeJsonParse } = require('../utils/jsonParser');
const { VALIDATION_ENABLED, VALIDATION_STRICT_MODE } = require('../config/validation');

/**
 * Сервис для централизованной валидации графов и нод
 *
 * Предоставляет единую точку входа для валидации с учетом конфигурации окружения.
 * В строгом режиме (dev/test) выбрасывает исключения, в production логирует и возвращает результат.
 */
class ValidationService {
    constructor() {
        this.validationEnabled = VALIDATION_ENABLED;
        this.strictMode = VALIDATION_STRICT_MODE;
    }

    /**
     * Парсит JSON строку графа с безопасной обработкой ошибок
     * @param {string|object} graph - Граф в виде строки или объекта
     * @param {string} contextName - Имя контекста для логирования
     * @returns {object|null} - Распарсенный граф или null при ошибке
     */
    parseGraph(graph, contextName = 'unknown context') {
        if (typeof graph === 'string') {
            return safeJsonParse(graph, null, contextName);
        }
        return graph;
    }

    /**
     * Валидирует конфигурацию графа
     * @param {object} graph - Объект графа для валидации
     * @param {string} contextName - Имя контекста для логирования (например, 'GraphExecutionEngine')
     * @returns {{success: boolean, error?: any, shouldSkip: boolean}} - Результат валидации
     */
    validateGraphStructure(graph, contextName = 'unknown context') {
        if (!this.validationEnabled) {
            return { success: true, shouldSkip: false };
        }

        // Сначала проверяем базовую структуру
        if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.connections)) {
            console.error(`[${contextName}] Graph validation failed: missing or invalid nodes/connections arrays`);

            if (this.strictMode) {
                throw new Error('Invalid graph structure: missing nodes or connections');
            }

            console.warn(`[${contextName}] Skipping graph execution due to missing basic structure in production mode`);
            return { success: false, error: 'Missing nodes or connections', shouldSkip: true };
        }

        // Затем выполняем полную валидацию схемы
        const validation = validateGraph(graph);

        if (!validation.success) {
            console.error(`[${contextName}] Graph validation failed:`, {
                errors: validation.error
            });

            if (this.strictMode) {
                throw new Error('Invalid graph structure');
            }

            // В production логируем и пропускаем выполнение
            console.warn(`[${contextName}] Skipping graph execution due to validation errors in production mode`);
            return { success: false, error: validation.error, shouldSkip: true };
        }

        return { success: true, shouldSkip: false };
    }

    /**
     * Валидирует конфигурацию ноды
     * @param {object} nodeConfig - Конфигурация ноды для валидации
     * @param {string} contextName - Имя контекста для логирования (например, 'NodeRegistry')
     * @returns {{success: boolean, error?: any, shouldSkip: boolean}} - Результат валидации
     */
    validateNode(nodeConfig, contextName = 'unknown context') {
        if (!this.validationEnabled) {
            return { success: true, shouldSkip: false };
        }

        const validation = validateNodeConfig(nodeConfig);

        if (!validation.success) {
            console.error(`[${contextName}] Validation failed for node type '${nodeConfig.type}':`, {
                type: nodeConfig.type,
                errors: validation.error
            });

            if (this.strictMode) {
                throw new Error(`Invalid node configuration for '${nodeConfig.type}'`);
            }

            // В production пропускаем невалидную ноду
            console.warn(`[${contextName}] Skipping registration of invalid node '${nodeConfig.type}' in production mode`);
            return { success: false, error: validation.error, shouldSkip: true };
        }

        return { success: true, shouldSkip: false };
    }

    /**
     * Проверяет базовую структуру графа (nodes и connections)
     * @param {object} graph - Объект графа
     * @returns {boolean} - true если структура валидна
     */
    hasValidBasicStructure(graph) {
        return !!(graph && Array.isArray(graph.nodes) && Array.isArray(graph.connections));
    }

    /**
     * Проверяет, включена ли валидация
     * @returns {boolean}
     */
    isValidationEnabled() {
        return this.validationEnabled;
    }

    /**
     * Проверяет, включен ли строгий режим
     * @returns {boolean}
     */
    isStrictMode() {
        return this.strictMode;
    }
}

// Экспортируем singleton instance
const validationServiceInstance = new ValidationService();
module.exports = validationServiceInstance;
