const { GRAPH_TYPES } = require('../../core/constants/graphTypes');

const usersNodes = [
  {
    type: 'user:check_blacklist',
    label: '❓ В черном списке?',
    category: 'Пользователи',
    description: 'Проверяет, находится ли пользователь в черном списке.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/users/check_blacklist').evaluate,
    computeInputs: (data) => [
      { id: 'user', name: 'Пользователь', type: 'User', required: true }
    ],
    computeOutputs: () => [
      { id: 'is_blacklisted', name: 'В ЧС', type: 'Boolean' }
    ],
    defaultData: {},
    theme: { headerColor: '#7c3aed', accentColor: '#8b5cf6' }
  },
  {
    type: 'user:set_blacklist',
    label: '🚫 Установить ЧС',
    category: 'Пользователи',
    description: 'Добавляет или убирает пользователя из черного списка.',
    graphType: GRAPH_TYPES.ALL,
    executor: require('../../core/nodes/users/set_blacklist').execute,
    computeInputs: (data) => [
      { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
      { id: 'user', name: 'Пользователь', type: 'User', required: true },
      { id: 'blacklist_status', name: 'Статус ЧС', type: 'Boolean', required: true, inlineField: true }
    ],
    computeOutputs: () => [
      { id: 'exec', name: 'Далее', type: 'Exec' },
      { id: 'updated_user', name: 'Обновленный пользователь', type: 'User' }
    ],
    defaultData: { blacklist_status: false },
    theme: { headerColor: '#7c3aed', accentColor: '#8b5cf6' }
  },
  {
    type: 'user:get_groups',
    label: '👥 Получить группы',
    category: 'Пользователи',
    description: 'Возвращает массив названий групп, в которых состоит пользователь.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/users/get_groups').evaluate,
    computeInputs: (data) => [
      { id: 'user', name: 'Пользователь', type: 'User', required: true }
    ],
    computeOutputs: () => [
      { id: 'groups', name: 'Группы', type: 'Array' }
    ],
    defaultData: {},
    theme: { headerColor: '#7c3aed', accentColor: '#8b5cf6' }
  },
  {
    type: 'user:get_permissions',
    label: '🔑 Получить права',
    category: 'Пользователи',
    description: 'Возвращает массив прав пользователя.',
    graphType: GRAPH_TYPES.ALL,
    evaluator: require('../../core/nodes/users/get_permissions').evaluate,
    computeInputs: (data) => [
      { id: 'user', name: 'Пользователь', type: 'User', required: true }
    ],
    computeOutputs: () => [
      { id: 'permissions', name: 'Права', type: 'Array' }
    ],
    defaultData: {},
    theme: { headerColor: '#7c3aed', accentColor: '#8b5cf6' }
  }
];

module.exports = usersNodes;