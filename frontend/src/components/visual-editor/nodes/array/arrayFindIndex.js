import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:find_index
 * Находит индекс элемента в массиве (или -1 если не найден)
 */
export const arrayFindIndexDefinition = new NodeDefinition({
  type: 'array:find_index',
  category: 'array',
  label: 'Найти индекс',
  description: 'Находит индекс элемента в массиве',



  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayFindIndexDefinition;
