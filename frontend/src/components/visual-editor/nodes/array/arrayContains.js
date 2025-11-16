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

  computeInputs: (data) => [
    { id: 'array', name: 'Массив', type: 'Array', description: 'Входной массив', required: true },
    { id: 'element', name: 'Элемент', type: 'Wildcard', description: 'Элемент для поиска', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Найден', type: 'Boolean', description: 'True если элемент найден' },
    { id: 'index', name: 'Индекс', type: 'Number', description: 'Индекс элемента (-1 если не найден)' },
  ],

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayContainsDefinition;
