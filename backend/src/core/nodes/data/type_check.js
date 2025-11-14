async function evaluate(node, pinId, context, helpers) {
    const { resolvePinValue } = helpers;
    const value = await resolvePinValue(node, 'value');
    const checkType = node.data?.checkType || 'string';

    if (pinId === 'result') {
        switch (checkType) {
            case 'string':
                return typeof value === 'string';
            
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            
            case 'numeric_string':
                // Проверяет, является ли значение строкой, которую можно преобразовать в число
                if (typeof value !== 'string') return false;
                const trimmed = value.trim();
                if (trimmed === '') return false;
                const num = Number(trimmed);
                return !isNaN(num) && isFinite(num);
            
            case 'boolean':
                return typeof value === 'boolean';
            
            case 'array':
                return Array.isArray(value);
            
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            
            case 'null':
                return value === null || value === undefined;
            
            default:
                return false;
        }
    }

    if (pinId === 'type_name') {
        // Возвращает строковое название типа
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    return null;
}

module.exports = {
    evaluate,
};

