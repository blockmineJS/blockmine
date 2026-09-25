import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:join
 * Объединяет элементы массива в строку с разделителем
 */
export const arrayJoinDefinition = new NodeDefinition({
  type: 'array:join',
  category: 'array',
  label: 'Объединить в строку',
  description: 'Объединяет элементы массива в строку с разделителем',



  defaultData: {
    array: '',
    separator: ', ',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayJoinDefinition;
