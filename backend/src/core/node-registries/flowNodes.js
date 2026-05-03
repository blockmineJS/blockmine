const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const flowNodes = [
  {
    type: 'flow:branch',
    label: '↔️ Ветвление (Branch)',
    category: 'Поток',
    description: 'if/else логика',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/flow/branch').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
      { id: 'condition', name: 'Условие', type: 'Boolean', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'exec_true', name: 'True', type: 'Exec' },
      { id: 'exec_false', name: 'False', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#10b981', accentColor: '#34d399' }
  },
  {
    type: 'flow:sequence',
    label: '⛓️ Последовательность',
    category: 'Поток',
    description: 'Выполняет действия по очереди',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/flow/sequence').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'exec_0', name: '0', type: 'Exec' },
      { id: 'exec_1', name: '1', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#10b981', accentColor: '#34d399' }
  },
  {
    type: 'flow:for_each',
    label: '🔁 Перебор массива (цикл)',
    category: 'Поток',
    description: 'Выполняет "Тело цикла" для каждого элемента в "Массиве".',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/flow/for_each').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
      { id: 'array', name: 'Массив', type: 'Array', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
      { id: 'element', name: 'Элемент', type: 'Any' },
      { id: 'index', name: 'Индекс', type: 'Number' },
      { id: 'completed', name: 'Завершено', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#10b981', accentColor: '#34d399' }
  },
  {
    type: 'flow:while',
    label: '🔁 Цикл While',
    category: 'Поток',
    description: 'Выполняет "Тело цикла" пока условие истинно.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/flow/while').execute,
    evaluator: require('../../core/nodes/flow/while').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
      { id: 'condition', name: 'Условие', type: 'Boolean', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
      { id: 'iteration', name: 'Итерация', type: 'Number' },
      { id: 'completed', name: 'Завершено', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#10b981', accentColor: '#34d399' }
  },
  {
    type: 'flow:break',
    label: '🛑 Выйти из цикла',
    category: 'Поток',
    description: 'Немедленно прерывает выполнение цикла (For Each Loop) и передает управление на его выход Completed.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/flow/break').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true }
    ],
    computeOutputs: (data) => [],
    defaultData: {},
    theme: { headerColor: '#10b981', accentColor: '#34d399' }
  },
  {
    type: 'flow:delay',
    label: '⏱️ Задержка',
    category: 'Поток',
    description: 'Ожидает указанное количество миллисекунд, затем продолжает выполнение.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/flow/delay').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
      { id: 'delay', name: 'Задержка (мс)', type: 'Number', required: false, inlineField: true, placeholder: '1000' }
    ],
    computeOutputs: (data) => [
      { id: 'exec', name: 'Далее', type: 'Exec' }
    ],
    defaultData: { delay: 1000 },
    theme: { headerColor: '#10b981', accentColor: '#34d399' }
  },
  {
    type: 'flow:switch',
    label: '🔄 Switch (свитч)',
    category: 'Поток',
    description: 'Выполняет разные действия в зависимости от значения. Автоматически определяет тип сравнения.',
    graphType: GRAPH_TYPES.ALL,
    dynamicPins: true,
    executor: require('../../core/nodes/flow/switch').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
      { id: 'value', name: 'Значение', type: 'Wildcard', required: true }
    ],
    computeOutputs: (data) => [
      { id: 'default', name: 'Default', type: 'Exec' }
    ],
    defaultData: {},
    theme: { headerColor: '#10b981', accentColor: '#34d399' }
  }
];

module.exports = flowNodes;