import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды math:random_number
 * Генерирует случайное число в заданном диапазоне
 */
export const mathRandomNumberDefinition = new NodeDefinition({
  type: 'math:random_number',
  category: 'math',
  label: 'Случайное число',
  description: 'Генерирует случайное число в заданном диапазоне',

  computeInputs: (data) => [
    {
      id: 'min',
      name: 'Мин',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '0'
    },
    {
      id: 'max',
      name: 'Макс',
      type: 'Number',
      required: false,
      inlineField: true,
      placeholder: '100'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Результат', type: 'Number' },
  ],

  defaultData: {
    min: 0,
    max: 100,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default mathRandomNumberDefinition;
