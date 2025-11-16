import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды string:matches
 * Проверяет совпадение строки с regex паттерном
 */
export const stringMatchesDefinition = new NodeDefinition({
  type: 'string:matches',
  category: 'string',
  label: 'Совпадает',
  description: 'Проверяет совпадение строки с regex паттерном',

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
      id: 'pattern',
      name: 'Паттерн',
      type: 'String',
      description: 'Регулярное выражение (regex). Примеры: "^[a-z]+$" - только строчные буквы, "\\d{3}" - три цифры',
      required: false,
      inlineField: true,
      placeholder: '^[a-z]+$'
    },
  ],

  computeOutputs: (data) => [
    { id: 'result', name: 'Result', type: 'Boolean' },
  ],

  defaultData: {
    text: '',
    pattern: '',
  },

  theme: {
    headerColor: '#db2777',
    accentColor: '#ec4899',
  },
});

export default stringMatchesDefinition;
