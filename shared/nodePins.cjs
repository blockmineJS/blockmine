const DYNAMIC_TYPES = new Set([
    'flow:sequence',
    'flow:branch',
    'flow:switch',
    'string:concat',
    'logic:operation',
    'data:array_literal',
    'data:make_object',
    'object:create',
    'math:operation',
    'data:get_argument',
    'data:get_variable',
    'action:http_request',
    'action:bot_set_variable',
    'event:custom_event',
    'event:call_event',
]);

function isDynamicNodeType(type) {
    return DYNAMIC_TYPES.has(type);
}

function pinCountOf(data, fallback) {
    const count = Number(data?.pinCount);
    return Number.isFinite(count) && count >= 0 ? count : fallback;
}

function keyValuePins(count) {
    const inputs = [];
    for (let i = 0; i < count; i += 1) {
        inputs.push({ id: `key_${i}`, name: `Ключ ${i}`, type: 'String' });
        inputs.push({ id: `value_${i}`, name: `Значение ${i}`, type: 'Wildcard' });
    }
    return inputs;
}

function computeDynamicInputs(type, data = {}, context = {}) {
    switch (type) {
        case 'flow:sequence':
            return [{ id: 'exec', name: 'Выполнить', type: 'Exec' }];
        case 'flow:branch': {
            const inputs = [{ id: 'exec', name: 'Выполнить', type: 'Exec' }];
            if (data.advanced) {
                const count = pinCountOf(data, 2);
                for (let i = 0; i < count; i += 1) {
                    inputs.push({
                        id: `pin_${i}`,
                        name: String.fromCharCode(65 + i),
                        type: 'Boolean',
                    });
                }
            } else {
                inputs.push({ id: 'condition', name: 'Condition', type: 'Boolean', required: true });
            }
            return inputs;
        }
        case 'flow:switch':
            return [
                { id: 'exec', name: 'Выполнить', type: 'Exec' },
                { id: 'value', name: 'Value', type: 'Wildcard', required: false, inlineField: true, placeholder: '...' },
            ];
        case 'string:concat': {
            const inputs = [];
            const count = pinCountOf(data, 2);
            for (let i = 0; i < count; i += 1) {
                inputs.push({
                    id: `pin_${i}`,
                    name: `Строка ${i}`,
                    type: 'String',
                    required: false,
                    inlineField: true,
                    placeholder: '...',
                });
            }
            return inputs;
        }
        case 'logic:operation': {
            const operation = data.operation || 'AND';
            if (operation === 'NOT') {
                return [{
                    id: 'pin_0',
                    name: 'A',
                    type: 'Boolean',
                    required: false,
                    inlineField: true,
                    placeholder: 'true/false',
                }];
            }
            const inputs = [];
            const count = pinCountOf(data, 2);
            for (let i = 0; i < count; i += 1) {
                inputs.push({
                    id: `pin_${i}`,
                    name: String.fromCharCode(65 + i),
                    type: 'Boolean',
                    required: false,
                    inlineField: true,
                    placeholder: 'true/false',
                });
            }
            return inputs;
        }
        case 'data:array_literal': {
            const inputs = [];
            const count = pinCountOf(data, 0);
            for (let i = 0; i < count; i += 1) {
                inputs.push({ id: `item_${i}`, name: `[${i}]`, type: 'Wildcard' });
            }
            return inputs;
        }
        case 'data:make_object':
            return keyValuePins(pinCountOf(data, 0));
        case 'object:create':
            return data.advanced ? [] : keyValuePins(pinCountOf(data, 0));
        case 'math:operation':
            return [
                { id: 'a', name: 'A', type: 'Number', required: false, inlineField: true, placeholder: '0' },
                { id: 'b', name: 'B', type: 'Number', required: false, inlineField: true, placeholder: '0' },
            ];
        case 'data:get_argument':
            return [{
                id: 'argumentName',
                name: 'Имя аргумента',
                type: 'String',
                required: false,
                inlineField: true,
                placeholder: 'имя_аргумента',
            }];
        case 'data:get_variable':
            return [{
                id: 'variableName',
                name: 'Имя переменной',
                type: 'String',
                required: false,
                inlineField: true,
                placeholder: 'имя_переменной',
            }];
        case 'action:http_request': {
            const inputs = [
                { id: 'exec', name: 'Выполнить', type: 'Exec' },
                { id: 'url', name: 'URL', type: 'String', required: false, inlineField: true, placeholder: 'https://api.com/{userId}' },
                { id: 'method', name: 'Method', type: 'String', required: false, inlineField: true, placeholder: 'GET' },
                { id: 'queryParams', name: 'Query Params', type: 'Object', required: false, inlineField: true },
                { id: 'headers', name: 'Headers', type: 'Object', required: false, inlineField: true },
            ];
            const method = data.method || 'GET';
            if (method !== 'GET' && method !== 'DELETE') {
                inputs.push({ id: 'body', name: 'Body', type: 'Wildcard', required: false, inlineField: true });
            }
            return inputs;
        }
        case 'action:bot_set_variable':
            return [
                { id: 'exec', name: 'Выполнить', type: 'Exec' },
                {
                    id: 'name',
                    name: 'Имя',
                    type: 'String',
                    required: false,
                    inlineField: true,
                    inlineFieldType: 'select',
                    inlineFieldOptions: (pinContext) => (pinContext?.variables || [])
                        .filter((variable) => variable.name)
                        .map((variable) => ({ value: variable.name, label: `${variable.name} (${variable.type})` })),
                    placeholder: 'имя_переменной',
                },
                { id: 'value', name: 'Значение', type: 'Wildcard', required: false, inlineField: true, placeholder: '...' },
            ];
        case 'event:custom_event':
            return [];
        case 'event:call_event': {
            const pins = [{ id: 'exec', name: 'Выполнить', type: 'Exec' }];
            if (data.selectedEventId != null) {
                const selectedNode = (context.nodes || []).find((node) => node.id === data.selectedEventId);
                if (selectedNode && selectedNode.type === 'event:custom_event') {
                    (selectedNode.data?.pins || [])
                        .filter((pin) => pin.type !== 'Exec')
                        .forEach((pin) => pins.push({ id: pin.id, name: pin.name, type: pin.type }));
                }
            }
            return pins;
        }
        default:
            return null;
    }
}

function computeDynamicOutputs(type, data = {}, context = {}) {
    switch (type) {
        case 'flow:sequence': {
            const outputs = [];
            const count = pinCountOf(data, 2);
            for (let i = 0; i < count; i += 1) {
                outputs.push({ id: `exec_${i}`, name: `${i}`, type: 'Exec' });
            }
            return outputs;
        }
        case 'flow:branch':
            return [
                { id: 'exec_true', name: 'True', type: 'Exec' },
                { id: 'exec_false', name: 'False', type: 'Exec' },
            ];
        case 'flow:switch': {
            const outputs = [];
            const caseCount = pinCountOf({ pinCount: data.caseCount }, 0);
            for (let i = 0; i < caseCount; i += 1) {
                const caseValue = data[`case_${i}`] || '';
                outputs.push({
                    id: `case_${i}`,
                    name: caseValue ? `Case: ${caseValue}` : `Case ${i}`,
                    type: 'Exec',
                });
            }
            outputs.push({ id: 'default', name: 'Default', type: 'Exec' });
            return outputs;
        }
        case 'string:concat':
            return [{ id: 'result', name: 'Result', type: 'String' }];
        case 'logic:operation':
            return [{ id: 'result', name: 'Result', type: 'Boolean' }];
        case 'data:array_literal':
            return [{ id: 'array', name: 'Array', type: 'Array' }];
        case 'data:make_object':
        case 'object:create':
            return [{ id: 'object', name: 'Object', type: 'Object' }];
        case 'math:operation': {
            const operation = data.operation || '+';
            const comparison = ['>', '<', '==', '>=', '<=', '!='].includes(operation);
            return [{ id: 'result', name: 'Result', type: comparison ? 'Boolean' : 'Number' }];
        }
        case 'data:get_argument': {
            const argumentName = data.argumentName;
            if (!argumentName) return [{ id: 'value', name: 'Value', type: 'Wildcard' }, { id: 'exists', name: 'Существует', type: 'Boolean' }];
            const argument = context.commandArguments?.find((item) => item.name === argumentName);
            return [
                { id: 'value', name: argumentName, type: argument?.type || 'Wildcard' },
                { id: 'exists', name: 'Существует', type: 'Boolean' },
            ];
        }
        case 'data:get_variable': {
            const variableName = data.variableName;
            if (!variableName) return [{ id: 'value', name: 'Value', type: 'Wildcard' }];
            const variable = context.variables?.find((item) => item.name === variableName);
            return [{ id: 'value', name: variableName, type: variable?.type || 'Wildcard' }];
        }
        case 'action:http_request':
            return [
                { id: 'exec', name: 'Exec', type: 'Exec' },
                { id: 'response', name: 'Response', type: 'Object' },
                { id: 'error', name: 'Error', type: 'String' },
            ];
        case 'action:bot_set_variable':
            return [{ id: 'exec', name: 'Выполнено', type: 'Exec' }];
        case 'event:custom_event':
            return [
                { id: 'exec', name: 'Выполнить', type: 'Exec' },
                ...(data.pins || []).map((pin) => ({ id: pin.id, name: pin.name, type: pin.type })),
            ];
        case 'event:call_event':
            return [{ id: 'exec', name: 'Выполнить', type: 'Exec' }];
        default:
            return null;
    }
}

function applyDynamicPins(config) {
    if (!config || !isDynamicNodeType(config.type)) return config;
    return {
        ...config,
        dynamicPins: true,
        computeInputs: (data, context) => computeDynamicInputs(config.type, data, context) || [],
        computeOutputs: (data, context) => computeDynamicOutputs(config.type, data, context) || [],
    };
}

function extractVariables(text) {
    if (!text || typeof text !== 'string') return [];
    return [...new Set([...text.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)].map((match) => match[1]))];
}

function withVariablePins(pins, data) {
    const next = Array.isArray(pins) ? [...pins] : [];
    const names = new Set();
    for (const value of Object.values(data || {})) {
        extractVariables(value).forEach((name) => names.add(name));
    }
    names.forEach((varName) => {
        const pinId = `var_${varName}`;
        if (!next.some((pin) => pin.id === pinId)) {
            next.push({
                id: pinId,
                name: varName,
                type: 'Wildcard',
                required: false,
            });
        }
    });
    return next;
}

module.exports = {
    isDynamicNodeType,
    computeDynamicInputs,
    computeDynamicOutputs,
    applyDynamicPins,
    withVariablePins,
};
