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

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
    { id: 'array', name: 'Массив', type: 'Array', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
    { id: 'element', name: 'Элемент', type: 'Wildcard' },
    { id: 'index', name: 'Индекс', type: 'Number' },
    { id: 'completed', name: 'Завершено', type: 'Exec' },
  ],

  theme: {
    headerColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
});

export default flowForEachDefinition;
