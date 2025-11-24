import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды array:join
 * Объединяет элементы массива в строку с разделителем
 */
export const arrayJoinDefinition = new NodeDefinition({
  type: 'array:join',
  category: 'array',
  label: 'Объединить в строку',
  description: 'Объединяет элементы массива в строку с разделителем',

  computeInputs: (data) => [
    {
      id: 'array',
      name: 'Массив',
      type: 'Array',
      description: 'Массив для объединения',
      required: false,
      inlineField: true,
      placeholder: '[]'
    },
    {
      id: 'separator',
      name: 'Разделитель',
      type: 'String',
      description: 'Разделитель между элементами',
      required: false,
      inlineField: true,
      placeholder: ', '
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'String', description: 'Строка из элементов массива' },
  ],

  defaultData: {
    array: '',
    separator: ', ',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default arrayJoinDefinition;
