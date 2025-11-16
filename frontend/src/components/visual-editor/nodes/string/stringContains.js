import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:contains
 * Проверяет содержится ли подстрока в строке
 */
export const stringContainsDefinition = new NodeDefinition({
  type: 'string:contains',
  category: 'string',
  label: 'Содержит',
  description: 'Проверяет содержится ли подстрока в строке',

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
      id: 'substring',
      name: 'Подстрока',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Искать...'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'Boolean' },
  ],

  defaultData: {
    text: '',
    substring: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringContainsDefinition;
