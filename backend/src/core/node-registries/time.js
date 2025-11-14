const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Время"
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'time:datetime_literal',
    label: '📅 Дата и время',
    category: 'Время',
    description: 'Создает объект даты и времени из строки. Если строка пустая, вернет текущее время.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/data/datetime_literal').evaluate,
    pins: {
      inputs: [
        { id: 'date', name: 'Дата (строка)', type: 'String', required: false }
      ],
      outputs: [
        { id: 'value', name: 'Дата', type: 'DateTime' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'time:now',
    label: '⏰ Текущее время',
    category: 'Время',
    description: 'Возвращает текущую дату и время.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/now').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'now', name: 'Сейчас', type: 'DateTime' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'time:format',
    label: '📝 Отформатировать дату',
    category: 'Время',
    description: 'Форматирует дату в строку. Формат по-умолчанию: yyyy-MM-dd HH:mm:ss',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/format').evaluate,
    pins: {
      inputs: [
        { id: 'date', name: 'Дата', type: 'DateTime', required: true },
        { id: 'format', name: 'Формат', type: 'String', required: false }
      ],
      outputs: [
        { id: 'formatted', name: 'Строка', type: 'String' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'time:add',
    label: '➕ Прибавить время',
    category: 'Время',
    description: 'Добавляет к дате указанный промежуток времени. Пример объекта продолжительности: { "seconds": 5, "minutes": 1 }',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/add').evaluate,
    pins: {
      inputs: [
        { id: 'date', name: 'Дата', type: 'DateTime', required: true },
        { id: 'duration', name: 'Продолжительность (объект)', type: 'Object', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Новая дата', type: 'DateTime' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'time:diff',
    label: '↔️ Разница во времени',
    category: 'Время',
    description: 'Вычисляет разницу между двумя датами в миллисекундах (Дата А - Дата Б).',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/diff').evaluate,
    pins: {
      inputs: [
        { id: 'date_left', name: 'Дата А', type: 'DateTime', required: true },
        { id: 'date_right', name: 'Дата Б', type: 'DateTime', required: true }
      ],
      outputs: [
        { id: 'diff', name: 'Разница (мс)', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'time:compare',
    label: '⚖️ Сравнить даты',
    category: 'Время',
    description: 'Сравнивает две даты.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../nodes/time/compare').evaluate,
    pins: {
      inputs: [
        { id: 'date_left', name: 'Дата А', type: 'DateTime', required: true },
        { id: 'date_right', name: 'Дата Б', type: 'DateTime', required: true },
        { id: 'operation', name: 'Операция', type: 'String', required: false }
      ],
      outputs: [
        { id: 'result', name: 'Результат', type: 'Boolean' }
      ]
    }
  });
}

module.exports = { registerNodes };
