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
      id: 'haystack',
      name: 'Текст',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Введите текст...'
    },
    {
      id: 'needle',
      name: 'Подстрока',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Искать...'
    },
    {
      id: 'case_sensitive',
      name: 'Учет регистра',
      type: 'Boolean',
      required: false,
      inlineField: true,
      defaultValue: false
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'Boolean' },
  ],

  defaultData: {
    haystack: '',
    needle: '',
    case_sensitive: false,
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringContainsDefinition;
