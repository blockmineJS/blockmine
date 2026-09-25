import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:split
 * Разделяет строку на массив по разделителю
 */
export const stringSplitDefinition = new NodeDefinition({
  type: 'string:split',
  category: 'string',
  label: 'Разделить',
  description: 'Разделяет строку на массив по разделителю',



  defaultData: {
    text: '',
    delimiter: ' ',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringSplitDefinition;
