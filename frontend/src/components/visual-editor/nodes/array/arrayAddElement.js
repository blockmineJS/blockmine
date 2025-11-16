import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:add_element
 * Добавляет элемент в конец массива
 */
export const arrayAddElementDefinition = new NodeDefinition({
  type: 'array:add_element',
  category: 'array',
  label: 'Добавить элемент',
  description: 'Добавляет элемент в конец массива',

  computeInputs: (data) => [
    { id: 'array', name: 'Массив', type: 'Array', description: 'Входной массив', required: true },
    { id: 'element', name: 'Элемент', type: 'Wildcard', description: 'Элемент для добавления', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Новый массив', type: 'Array', description: 'Массив с добавленным элементом' },
  ],

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayAddElementDefinition;
