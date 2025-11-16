import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:get_next
 * Получает следующий элемент массива
 */
export const arrayGetNextDefinition = new NodeDefinition({
  type: 'array:get_next',
  category: 'array',
  label: 'Следующий элемент',
  description: 'Получает следующий элемент массива',

  computeInputs: (data) => [
    { id: 'array', name: 'Массив', type: 'Array', description: 'Входной массив', required: true },
    { id: 'current_index', name: 'Текущий индекс', type: 'Number', description: 'Текущий индекс', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'next_element', name: 'Следующий элемент', type: 'Wildcard', description: 'Следующий элемент' },
    { id: 'next_index', name: 'Следующий индекс', type: 'Number', description: 'Следующий индекс' },
    { id: 'has_next', name: 'Есть следующий?', type: 'Boolean', description: 'True если следующий элемент существует' },
  ],

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayGetNextDefinition;
