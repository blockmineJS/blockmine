/**
 * Регистрация нод категории "Строки"
 */
function registerNodes(registry) {
  const all = 'all';

  registry.registerNodeType({
    type: 'string:contains',
    label: '🔍 Строка содержит',
    category: 'Строки',
    description: 'Проверяет, содержит ли одна строка другую.',
    graphType: all,
    evaluator: require('../nodes/strings/contains').evaluate,
    pins: {
      inputs: [
        { id: 'haystack', name: 'Строка', type: 'String', required: true },
        { id: 'needle', name: 'Подстрока', type: 'String', required: true },
        { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
      ],
      outputs: [
        { id: 'result', name: 'Содержит?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'string:matches',
    label: '🔎 RegEx совпадает',
    category: 'Строки',
    description: 'Проверяет совпадение с регулярным выражением.',
    graphType: all,
    evaluator: require('../nodes/strings/matches').evaluate,
    pins: {
      inputs: [
        { id: 'string', name: 'Строка', type: 'String', required: true },
        { id: 'regex', name: 'RegEx', type: 'String', required: true }
      ],
      outputs: [
        { id: 'result', name: 'Совпадает?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'string:equals',
    label: '🔤 Строка равна',
    category: 'Строки',
    description: 'Проверяет равенство двух строк.',
    graphType: all,
    evaluator: require('../nodes/strings/equals').evaluate,
    pins: {
      inputs: [
        { id: 'a', name: 'A', type: 'String', required: true },
        { id: 'b', name: 'B', type: 'String', required: true },
        { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
      ],
      outputs: [
        { id: 'result', name: 'Равны?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'string:starts_with',
    label: '▶️ Начинается с',
    category: 'Строки',
    description: 'Проверяет, начинается ли строка с подстроки.',
    graphType: all,
    evaluator: require('../nodes/strings/starts_with').evaluate,
    pins: {
      inputs: [
        { id: 'string', name: 'Строка', type: 'String', required: true },
        { id: 'prefix', name: 'Префикс', type: 'String', required: true },
        { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
      ],
      outputs: [
        { id: 'result', name: 'Начинается?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'string:ends_with',
    label: '◀️ Заканчивается на',
    category: 'Строки',
    description: 'Проверяет, заканчивается ли строка подстрокой.',
    graphType: all,
    evaluator: require('../nodes/strings/ends_with').evaluate,
    pins: {
      inputs: [
        { id: 'string', name: 'Строка', type: 'String', required: true },
        { id: 'suffix', name: 'Суффикс', type: 'String', required: true },
        { id: 'case_sensitive', name: 'Учет регистра', type: 'Boolean', required: false }
      ],
      outputs: [
        { id: 'result', name: 'Заканчивается?', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'string:length',
    label: '📏 Длина строки',
    category: 'Строки',
    description: 'Возвращает количество символов.',
    graphType: all,
    evaluator: require('../nodes/strings/length').evaluate,
    pins: {
      inputs: [
        { id: 'string', name: 'Строка', type: 'String', required: true }
      ],
      outputs: [
        { id: 'length', name: 'Длина', type: 'Number' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'string:split',
    label: '✂️ Разделить строку',
    category: 'Строки',
    description: 'Разделяет строку на массив по разделителю.',
    graphType: all,
    evaluator: require('../nodes/strings/split').evaluate,
    pins: {
      inputs: [
        { id: 'string', name: 'Строка', type: 'String', required: true },
        { id: 'separator', name: 'Разделитель', type: 'String', required: true }
      ],
      outputs: [
        { id: 'array', name: 'Массив', type: 'Array' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'string:concat',
    label: 'Строка: Объединить',
    category: 'Строки',
    description: 'Объединяет две или более строки в одну.',
    graphType: all,
    dynamicPins: true,
    evaluator: require('../nodes/strings/concat').evaluate,
    pins: {
      inputs: [],
      outputs: [
        { id: 'result', name: 'Результат', type: 'String' }
      ]
    }
  });
}

module.exports = { registerNodes };
