import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:ends_with
 * Проверяет заканчивается ли строка суффиксом
 */
export const stringEndsWithDefinition = new NodeDefinition({
  type: 'string:ends_with',
  category: 'string',
  label: 'Заканчивается на',
  description: 'Проверяет заканчивается ли строка суффиксом',

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
      id: 'suffix',
      name: 'Суффикс',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Заканчивается на...'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'Boolean' },
  ],

  defaultData: {
    text: '',
    suffix: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringEndsWithDefinition;
