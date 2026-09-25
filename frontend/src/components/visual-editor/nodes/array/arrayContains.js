import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:contains
 * Проверяет, содержит ли массив указанный элемент и возвращает его индекс
 */
export const arrayContainsDefinition = new NodeDefinition({
  type: 'array:contains',
  category: 'array',
  label: 'Содержит',
  description: 'Проверяет, содержит ли массив указанный элемент',



  defaultData: {
    array: '',
    element: '',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayContainsDefinition;
