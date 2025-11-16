import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:get_by_index
 * Получает элемент массива по его индексу
 */
export const arrayGetByIndexDefinition = new NodeDefinition({
  type: 'array:get_by_index',
  category: 'array',
  label: 'Получить по индексу',
  description: 'Получает элемент массива по его индексу',

  computeInputs: (data) => [
    { id: 'array', name: 'Массив', type: 'Array', description: 'Входной массив', required: true },
    {
      id: 'index',
      name: 'Индекс',
      type: 'Number',
      description: 'Индекс элемента',
      required: false,
      inlineField: true,
      placeholder: '0'
    },
  ],

  computeOutputs: (data) => [
    { id: 'element', name: 'Элемент', type: 'Wildcard', description: 'Элемент по индексу' },
  ],

  defaultData: {
    index: 0,
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayGetByIndexDefinition;
