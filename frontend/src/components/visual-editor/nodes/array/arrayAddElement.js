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



  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayAddElementDefinition;
