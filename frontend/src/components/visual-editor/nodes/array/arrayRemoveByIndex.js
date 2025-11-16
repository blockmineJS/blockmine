import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:remove_by_index
 * Удаляет элемент из массива по его индексу
 */
export const arrayRemoveByIndexDefinition = new NodeDefinition({
  type: 'array:remove_by_index',
  category: 'array',
  label: 'Удалить по индексу',
  description: 'Удаляет элемент из массива по его индексу',

  computeInputs: (data) => [
    { id: 'array', name: 'Массив', type: 'Array', description: 'Входной массив', required: true },
    {
      id: 'index',
      name: 'Индекс',
      type: 'Number',
      description: 'Индекс элемента для удаления',
      required: false,
      inlineField: true,
      placeholder: '0'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Новый массив', type: 'Array', description: 'Массив без элемента' },
  ],

  defaultData: {
    index: 0,
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayRemoveByIndexDefinition;
