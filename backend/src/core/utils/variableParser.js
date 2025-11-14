const { safeJsonParse } = require('./jsonParser');

/**
 * Парсит значение переменной в зависимости от её типа
 * @param {object} variable - Объект переменной с полями type, name, value
 * @param {string} variable.type - Тип переменной ('number', 'boolean', 'array', 'string')
 * @param {string} variable.name - Имя переменной (для логирования)
 * @param {*} variable.value - Исходное значение переменной
 * @param {string} [contextName] - Имя контекста для логирования (например, 'EventGraph ID 123')
 * @returns {*} - Распарсенное значение переменной
 */
function parseVariableValue(variable, contextName = 'unknown context') {
    const { type, name, value } = variable;

    try {
        switch (type) {
            case 'number':
                return Number(value) || 0;

            case 'boolean':
                return value === 'true';

            case 'array': {
                const parsedArray = safeJsonParse(value, [], `variable ${name}`);
                if (!Array.isArray(parsedArray)) {
                    console.warn(
                        `[VariableParser] Failed to parse variable "${name}" as array in ${contextName}. ` +
                        `Falling back to empty array. Raw value:`,
                        value
                    );
                    return [];
                }
                return parsedArray;
            }

            default:
                return value;
        }
    } catch (e) {
        console.error(`[VariableParser] Error parsing variable "${name}" in ${contextName}:`, e);
        return getDefaultValueForType(type);
    }
}

/**
 * Возвращает значение по умолчанию для типа переменной
 * @param {string} type - Тип переменной
 * @returns {*} - Значение по умолчанию
 */
function getDefaultValueForType(type) {
    switch (type) {
        case 'number':
            return 0;
        case 'boolean':
            return false;
        case 'array':
            return [];
        default:
            return '';
    }
}

/**
 * Парсит массив переменных и возвращает объект с распарсенными значениями
 * @param {Array} variables - Массив объектов переменных
 * @param {string} [contextName] - Имя контекста для логирования
 * @returns {object} - Объект с именами переменных в качестве ключей и распарсенными значениями
 */
function parseVariables(variables, contextName = 'unknown context') {
    if (!Array.isArray(variables)) {
        return {};
    }

    const result = {};
    for (const variable of variables) {
        if (!variable.name) {
            console.warn(`[VariableParser] Skipping variable without name in ${contextName}`);
            continue;
        }
        result[variable.name] = parseVariableValue(variable, contextName);
    }
    return result;
}

module.exports = {
    parseVariableValue,
    parseVariables,
    getDefaultValueForType,
};
