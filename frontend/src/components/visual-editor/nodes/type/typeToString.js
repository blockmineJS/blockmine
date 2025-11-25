import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды type:to_string
 * Преобразует любое значение в строку
 */
export const typeToStringDefinition = new NodeDefinition({
  type: 'type:to_string',
  category: 'type',
  label: 'В строку',
  description: 'Преобразует любое значение в строку (toString)',

  computeInputs: (data) => [
    {
      id: 'value',
      name: 'Значение',
      type: 'Wildcard',
      description: 'Значение для преобразования',
      required: false,
      inlineField: true,
      placeholder: 'Значение...'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'String', description: 'Строковое представление' },
  ],

  defaultData: {
    value: '',
  },

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default typeToStringDefinition;
