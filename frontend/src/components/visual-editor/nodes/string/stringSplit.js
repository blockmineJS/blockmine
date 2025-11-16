import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:split
 * Разделяет строку на массив по разделителю
 */
export const stringSplitDefinition = new NodeDefinition({
  type: 'string:split',
  category: 'string',
  label: 'Разделить',
  description: 'Разделяет строку на массив по разделителю',

  computeInputs: (data) => [
    {
      id: 'text',
      name: 'Текст',
      type: 'String',
      required: false,
      inlineField: true,
      placeholder: 'Введите текст...'
    },
    {
      id: 'delimiter',
      name: 'Разделитель',
      type: 'String',
      description: 'Символ или строка для разделения. Примеры: пробел " ", запятая ",", точка ".", точка с запятой ";", перенос строки "\\n"',
      required: false,
      inlineField: true,
      placeholder: ','
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Массив', type: 'Array' },
  ],

  defaultData: {
    text: '',
    delimiter: ' ',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringSplitDefinition;
