import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:get_random_element
 * Возвращает случайный элемент из массива и его индекс
 */
export const arrayGetRandomElementDefinition = new NodeDefinition({
  type: 'array:get_random_element',
  category: 'array',
  label: 'Случайный элемент',
  description: 'Возвращает случайный элемент из массива и его индекс',



  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayGetRandomElementDefinition;
