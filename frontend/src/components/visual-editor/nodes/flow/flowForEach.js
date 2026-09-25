import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды flow:for_each
 * Выполняет тело цикла для каждого элемента массива
 */
export const flowForEachDefinition = new NodeDefinition({
  type: 'flow:for_each',
  category: 'flow',
  label: 'Перебор массива (цикл)',
  description: 'Выполняет "Тело цикла" для каждого элемента в "Массиве"',



  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default flowForEachDefinition;
