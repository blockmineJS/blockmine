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
    label: '🔁 Перебор (for)',
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
    label: '🛑 Break (выйти из цикла)',
    category: 'Поток',
    description: 'Немедленно прерывает выполнение цикла и передает управление на его выход Завершено.',
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
    label: '🔀 Switch',
    category: 'Поток',
    description: 'Выполняет разные действия в зависимости от значения.',
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
  },
  {
    type: 'flow:timer',
    label: '⏲️ Таймер',
    category: 'Поток',
    description: 'Выполняет тело цикла каждые N секунд. Можно прервать через Break.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/flow/timer').execute,
    evaluator: require('../../core/nodes/flow/timer').evaluate,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
      { id: 'interval', name: 'Интервал (сек)', type: 'Number', required: false, inlineField: true, placeholder: '1' },
      { id: 'max_ticks', name: 'Макс. тиков (0 = ∞)', type: 'Number', required: false, inlineField: true, placeholder: '0' }
    ],
    computeOutputs: (data) => [
      { id: 'loop_body', name: 'Тело цикла', type: 'Exec' },
      { id: 'tick', name: 'Тик', type: 'Number' },
      { id: 'completed', name: 'Завершено', type: 'Exec' }
    ],
    defaultData: { interval: 1, max_ticks: 0 },
    theme: { headerColor: '#10b981', accentColor: '#34d399' }
  },
];

module.exports = flowNodes;
