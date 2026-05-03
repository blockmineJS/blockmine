const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const stringsNodes = [
  {
    type: 'string:contains',
    label: '🔍 Строка содержит',
    category: 'Строки',
    description: 'Проверяет, содержит ли одна строка другую.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/contains').evaluate,
    computeInputs: (data) => [
      { id: 'haystack', name: 'Строка', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'needle', name: 'Подстрока', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Содержит?', type: 'Boolean' }
    ],
    defaultData: { haystack: '', needle: '', case_sensitive: false }
  },
  {
    type: 'string:matches',
    label: '🔎 RegEx совпадает',
    category: 'Строки',
    description: 'Проверяет совпадение с регулярным выражением.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/matches').evaluate,
    computeInputs: (data) => [
      { id: 'string', name: 'Строка', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'regex', name: 'RegEx', type: 'String', required: true, inlineField: true, placeholder: '' }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Совпадает?', type: 'Boolean' }
    ],
    defaultData: { string: '', regex: '' }
  },
  {
    type: 'string:equals',
    label: '🔤 Строка равна',
    category: 'Строки',
    description: 'Проверяет равенство двух строк.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/equals').evaluate,
    computeInputs: (data) => [
      { id: 'a', name: 'A', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'b', name: 'B', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Равны?', type: 'Boolean' }
    ],
    defaultData: { a: '', b: '', case_sensitive: false }
  },
  {
    type: 'string:starts_with',
    label: '▶️ Начинается с',
    category: 'Строки',
    description: 'Проверяет, начинается ли строка с подстроки.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/starts_with').evaluate,
    computeInputs: (data) => [
      { id: 'string', name: 'Строка', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'prefix', name: 'Префикс', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Начинается?', type: 'Boolean' }
    ],
    defaultData: { string: '', prefix: '', case_sensitive: false }
  },
  {
    type: 'string:ends_with',
    label: '◀️ Заканчивается на',
    category: 'Строки',
    description: 'Проверяет, заканчивается ли строка подстрокой.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/ends_with').evaluate,
    computeInputs: (data) => [
      { id: 'string', name: 'Строка', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'suffix', name: 'Суффикс', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Заканчивается?', type: 'Boolean' }
    ],
    defaultData: { string: '', suffix: '', case_sensitive: false }
  },
  {
    type: 'string:length',
    label: '📏 Длина строки',
    category: 'Строки',
    description: 'Возвращает количество символов.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/length').evaluate,
    computeInputs: (data) => [
      { id: 'string', name: 'Строка', type: 'String', required: true, inlineField: true, placeholder: '' }
    ],
    computeOutputs: () => [
      { id: 'length', name: 'Длина', type: 'Number' }
    ],
    defaultData: { string: '' }
  },
  {
    type: 'string:split',
    label: '✂️ Разделить строку',
    category: 'Строки',
    description: 'Разделяет строку на массив по разделителю.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/split').evaluate,
    computeInputs: (data) => [
      { id: 'string', name: 'Строка', type: 'String', required: true, inlineField: true, placeholder: '' },
      { id: 'separator', name: 'Разделитель', type: 'String', required: true, inlineField: true, placeholder: ',' }
    ],
    computeOutputs: () => [
      { id: 'array', name: 'Массив', type: 'Array' }
    ],
    defaultData: { string: '', separator: ',' }
  },
  {
    type: 'string:concat',
    label: 'Строка: Объединить',
    category: 'Строки',
    description: 'Объединяет две или более строки в одну.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    evaluator: require('../../core/nodes/strings/concat').evaluate,
    computeInputs: (data) => [],
    computeOutputs: () => [
      { id: 'result', name: 'Результат', type: 'String' }
    ],
    defaultData: {}
  },
  {
    type: 'string:to_upper',
    label: '⬆️ В верхний регистр',
    category: 'Строки',
    description: 'Преобразует строку в верхний регистр (UPPERCASE).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/to_upper').evaluate,
    computeInputs: (data) => [
      { id: 'text', name: 'Текст', type: 'String', required: false, inlineField: true, placeholder: '' }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Result', type: 'String' }
    ],
    defaultData: { text: '' }
  },
  {
    type: 'string:to_lower',
    label: '⬇️ В нижний регистр',
    category: 'Строки',
    description: 'Преобразует строку в нижний регистр (lowercase).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/strings/to_lower').evaluate,
    computeInputs: (data) => [
      { id: 'text', name: 'Текст', type: 'String', required: false, inlineField: true, placeholder: '' }
    ],
    computeOutputs: () => [
      { id: 'result', name: 'Result', type: 'String' }
    ],
    defaultData: { text: '' }
  }
];

module.exports = stringsNodes;
