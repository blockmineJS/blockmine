import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:string_literal
 * Строковый литерал с поддержкой переменных
 */
export const stringLiteralDefinition = new NodeDefinition({
  type: 'data:string_literal',
  category: 'string',
  label: 'Строка',
  description: 'Строка с поддержкой переменных {name}',

  computeInputs: (data) => [
    {
      id: 'value',
      name: 'Текст',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Введите текст с {переменными}...'
    }
  ],

  computeOutputs: (data) => [
    { id: 'value', name: 'Value', type: 'String', description: 'Итоговая строка' },
  ],

  defaultData: {
    value: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringLiteralDefinition;
