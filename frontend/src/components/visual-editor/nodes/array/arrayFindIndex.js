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

  computeInputs: (data) => [
    { id: 'array', name: 'Массив', type: 'Array', description: 'Входной массив', required: true },
    { id: 'element', name: 'Элемент', type: 'Wildcard', description: 'Элемент для поиска', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'index', name: 'Индекс', type: 'Number', description: 'Индекс элемента (-1 если не найден)' },
  ],

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayFindIndexDefinition;
