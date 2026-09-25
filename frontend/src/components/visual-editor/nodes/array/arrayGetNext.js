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



  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayGetNextDefinition;
