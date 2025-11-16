import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:starts_with
 * Проверяет начинается ли строка с префикса
 */
export const stringStartsWithDefinition = new NodeDefinition({
  type: 'string:starts_with',
  category: 'string',
  label: 'Начинается с',
  description: 'Проверяет начинается ли строка с префикса',

  computeInputs: (data) => [
    {
      id: 'text',
      name: 'Текст',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Введите текст...'
    },
    {
      id: 'prefix',
      name: 'Префикс',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Начинается с...'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'Boolean' },
  ],

  defaultData: {
    text: '',
    prefix: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringStartsWithDefinition;
