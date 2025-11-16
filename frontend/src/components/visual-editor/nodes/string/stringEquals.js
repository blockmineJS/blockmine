import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:equals
 * Сравнивает две строки на равенство
 */
export const stringEqualsDefinition = new NodeDefinition({
  type: 'string:equals',
  category: 'string',
  label: 'Равно',
  description: 'Сравнивает две строки на равенство',

  computeInputs: (data) => [
    {
      id: 'a',
      name: 'A',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Строка A'
    },
    {
      id: 'b',
      name: 'B',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Строка B'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'Boolean' },
  ],

  defaultData: {
    a: '',
    b: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringEqualsDefinition;
