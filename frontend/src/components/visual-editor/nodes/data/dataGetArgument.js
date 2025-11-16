import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:get_argument
 * Получает значение аргумента команды
 */
export const dataGetArgumentDefinition = new NodeDefinition({
  type: 'data:get_argument',
  category: 'data',
  label: 'Получить аргумент',
  description: 'Получить значение аргумента команды',

  computeInputs: (data) => [
    {
      id: 'argumentName',
      name: 'Имя аргумента',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'имя_аргумента'
    }
  ],

  computeOutputs: (data, context) => {
    const argumentName = data.argumentName;
    if (!argumentName) {
      return [{ id: 'value', name: 'Value', type: 'Wildcard' }];
    }

    // Находим тип аргумента из контекста
    const argument = context.commandArguments?.find(a => a.name === argumentName);
    const type = argument?.type || 'Wildcard';

    return [
      { id: 'value', name: argumentName, type, description: `Значение аргумента ${argumentName}` },
    ];
  },

  defaultData: {
    argumentName: '',
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataGetArgumentDefinition;
