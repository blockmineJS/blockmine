import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды data:length
 * Возвращает количество элементов в массиве или длину строки
 */
export const dataLengthDefinition = new NodeDefinition({
  type: 'data:length',
  category: 'data',
  label: 'Длина',
  description: 'Размер массива или длина строки',



  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default dataLengthDefinition;
