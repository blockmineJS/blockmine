const { GRAPH_TYPES } = require('../constants/graphTypes');

const timeNodes = [
  {
    type: 'time:datetime_literal',
    label: '📅 Дата и время',
    category: 'Время',
    description: 'Создает объект даты и времени из строки. Если строка пустая, вернет текущее время.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/datetime_literal').evaluate,
    computeInputs: (data) => [
      { id: 'date', name: 'Дата (строка)', type: 'String', required: false, inlineField: true, placeholder: '2024-01-01 12:00' }
    ],
    computeOutputs: (data) => [
      { id: 'value', name: 'Дата', type: 'DateTime' }
    ],
    defaultData: { date: '' },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'time:now',
    label: '⏰ Текущее время',
    category: 'Время',
    description: 'Возвращает текущую дату и время.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/now').evaluate,
    computeInputs: () => [],
    computeOutputs: () => [
      { id: 'now', name: 'Сейчас', type: 'DateTime' }
    ],
    defaultData: {},
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'time:format',
    label: '📝 Отформатировать дату',
    category: 'Время',
    description: 'Форматирует дату в строку. Формат по-умолчанию: yyyy-MM-dd HH:mm:ss',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/format').evaluate,
    computeInputs: (data) => [
      { id: 'date', name: 'Дата', type: 'DateTime', required: true, inlineField: true, placeholder: '' },
      { id: 'format', name: 'Формат', type: 'String', required: false, inlineField: true, placeholder: 'yyyy-MM-dd HH:mm:ss' }
    ],
    computeOutputs: (data) => [
      { id: 'formatted', name: 'Строка', type: 'String' }
    ],
    defaultData: { format: 'yyyy-MM-dd HH:mm:ss' },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'time:add',
    label: '➕ Прибавить время',
    category: 'Время',
    description: 'Добавляет к дате указанный промежуток времени. Пример объекта продолжительности: { "seconds": 5, "minutes": 1 }',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/add').evaluate,
    computeInputs: (data) => [
      { id: 'date', name: 'Дата', type: 'DateTime', required: true, inlineField: true, placeholder: '' },
      { id: 'duration', name: 'Продолжительность', type: 'Object', required: true, inlineField: true, placeholder: '{ seconds: 5 }' }
    ],
    computeOutputs: (data) => [
      { id: 'result', name: 'Новая дата', type: 'DateTime' }
    ],
    defaultData: { duration: null },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'time:diff',
    label: '↔️ Разница во времени',
    category: 'Время',
    description: 'Вычисляет разницу между двумя датами в миллисекундах (Дата А - Дата Б).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/diff').evaluate,
    computeInputs: (data) => [
      { id: 'date_left', name: 'Дата А', type: 'DateTime', required: true, inlineField: true, placeholder: '' },
      { id: 'date_right', name: 'Дата Б', type: 'DateTime', required: true, inlineField: true, placeholder: '' }
    ],
    computeOutputs: (data) => [
      { id: 'diff', name: 'Разница (мс)', type: 'Number' }
    ],
    defaultData: {},
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  },
  {
    type: 'time:compare',
    label: '⚖️ Сравнить даты',
    category: 'Время',
    description: 'Сравнивает две даты.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/compare').evaluate,
    computeInputs: (data) => [
      { id: 'date_left', name: 'Дата А', type: 'DateTime', required: true, inlineField: true, placeholder: '' },
      { id: 'date_right', name: 'Дата Б', type: 'DateTime', required: true, inlineField: true, placeholder: '' },
      { id: 'operation', name: 'Операция', type: 'String', required: false, inlineField: true, placeholder: 'before|after|equal' }
    ],
    computeOutputs: (data) => [
      { id: 'result', name: 'Результат', type: 'Boolean' }
    ],
    defaultData: { operation: '' },
    theme: { headerColor: '#d97706', accentColor: '#f59e0b' }
  }
];

module.exports = timeNodes;