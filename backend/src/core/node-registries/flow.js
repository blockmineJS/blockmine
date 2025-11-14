const { GRAPH_TYPES } = require('../constants/graphTypes');

/**
 * Регистрация нод категории "Управление потоком" (Поток)
 */
function registerNodes(registry) {
  registry.registerNodeType({
    type: 'flow:branch',
    label: '↔️ Ветвление (Branch)',
    category: 'Поток',
    description: 'if/else логика',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/flow/branch').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'condition', name: 'Условие', type: 'Boolean', required: true }
      ],
      outputs: [
        { id: 'exec_true', name: 'True', type: 'Exec' },
        { id: 'exec_false', name: 'False', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'flow:sequence',
    label: '⛓️ Последовательность',
    category: 'Поток',
    description: 'Выполняет действия по очереди',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/flow/sequence').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true }
      ],
      outputs: [
        { id: 'exec_0', name: '0', type: 'Exec' },
        { id: 'exec_1', name: '1', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'flow:for_each',
    label: '🔁 Перебор массива (цикл)',
    category: 'Поток',
    description: 'Выполняет "Тело цикла" для каждого элемента в "Массиве".',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/flow/for_each').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'array', name: 'Массив', type: 'Array', required: true }
      ],
      outputs: [
        { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
        { id: 'element', name: 'Элемент', type: 'Any' },
        { id: 'index', name: 'Индекс', type: 'Number' },
        { id: 'completed', name: 'Завершено', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'flow:while',
    label: '🔁 Цикл While',
    category: 'Поток',
    description: 'Выполняет "Тело цикла" пока условие истинно.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/flow/while').execute,
    evaluator: require('../nodes/flow/while').evaluate,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'condition', name: 'Условие', type: 'Boolean', required: true }
      ],
      outputs: [
        { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
        { id: 'iteration', name: 'Итерация', type: 'Number' },
        { id: 'completed', name: 'Завершено', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'flow:break',
    label: '🛑 Выйти из цикла',
    category: 'Поток',
    description: 'Немедленно прерывает выполнение цикла (For Each Loop) и передает управление на его выход Completed.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/flow/break').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true }
      ],
      outputs: []
    }
  });

  registry.registerNodeType({
    type: 'flow:delay',
    label: '⏱️ Задержка',
    category: 'Поток',
    description: 'Ожидает указанное количество миллисекунд, затем продолжает выполнение.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../nodes/flow/delay').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'delay', name: 'Задержка (мс)', type: 'Number', required: false }
      ],
      outputs: [
        { id: 'exec', name: 'Далее', type: 'Exec' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'flow:switch',
    label: '🔄 Switch (свитч)',
    category: 'Поток',
    description: 'Выполняет разные действия в зависимости от значения. Автоматически определяет тип сравнения.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    executor: require('../nodes/flow/switch').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
      ],
      outputs: [
        { id: 'default', name: 'Default', type: 'Exec' }
      ]
    }
  });
}

module.exports = { registerNodes };
