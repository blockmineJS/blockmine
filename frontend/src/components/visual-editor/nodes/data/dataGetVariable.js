import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:get_variable
 * Получает значение переменной из проекта
 */
export const dataGetVariableDefinition = new NodeDefinition({
  type: 'data:get_variable',
  category: 'data',
  label: 'Получить переменную',
  description: 'Получить значение переменной',

  computeInputs: (data) => [
    {
      id: 'variableName',
      name: 'Имя переменной',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'имя_переменной'
    }
  ],

  computeOutputs: (data, context) => {
    const variableName = data.variableName;
    if (!variableName) {
      return [{ id: 'value', name: 'Value', type: 'Wildcard' }];
    }

    // Находим тип переменной из контекста
    const variable = context.variables?.find(v => v.name === variableName);
    const type = variable?.type || 'Wildcard';

    return [
      { id: 'value', name: variableName, type, description: `Значение переменной ${variableName}` },
    ];
  },

  defaultData: {
    variableName: '',
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetVariableDefinition;
