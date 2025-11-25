import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:to_upper
 * Преобразует строку в верхний регистр
 */
export const stringToUpperDefinition = new NodeDefinition({
  type: 'string:to_upper',
  category: 'string',
  label: 'В верхний регистр',
  description: 'Преобразует строку в верхний регистр (UPPERCASE)',

  computeInputs: (data) => [
    {
      id: 'text',
      name: 'Текст',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Введите текст...'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'String' },
  ],

  defaultData: {
    text: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringToUpperDefinition;
