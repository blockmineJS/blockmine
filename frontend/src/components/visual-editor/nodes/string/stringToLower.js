import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:to_lower
 * Преобразует строку в нижний регистр
 */
export const stringToLowerDefinition = new NodeDefinition({
  type: 'string:to_lower',
  category: 'string',
  label: 'В нижний регистр',
  description: 'Преобразует строку в нижний регистр (lowercase)',

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

export default stringToLowerDefinition;
