/**
 * Регистрация нод категории "Пользователи"
 */
function registerNodes(registry) {
  const all = 'all';

  registry.registerNodeType({
    type: 'user:check_blacklist',
    label: '❓ В черном списке?',
    category: 'Пользователи',
    description: 'Проверяет, находится ли пользователь в черном списке.',
    graphType: all,
    evaluator: require('../nodes/users/check_blacklist').evaluate,
    pins: {
      inputs: [
        { id: 'user', name: 'Пользователь', type: 'User', required: true }
      ],
      outputs: [
        { id: 'is_blacklisted', name: 'В ЧС', type: 'Boolean' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'user:set_blacklist',
    label: '🚫 Установить ЧС',
    category: 'Пользователи',
    description: 'Добавляет или убирает пользователя из черного списка.',
    graphType: all,
    executor: require('../nodes/users/set_blacklist').execute,
    pins: {
      inputs: [
        { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
        { id: 'user', name: 'Пользователь', type: 'User', required: true },
        { id: 'blacklist_status', name: 'Статус ЧС', type: 'Boolean', required: true }
      ],
      outputs: [
        { id: 'exec', name: 'Далее', type: 'Exec' },
        { id: 'updated_user', name: 'Обновленный пользователь', type: 'User' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'user:get_groups',
    label: '👥 Получить группы',
    category: 'Пользователь',
    description: 'Возвращает массив названий групп, в которых состоит пользователь.',
    graphType: all,
    evaluator: require('../nodes/users/get_groups').evaluate,
    pins: {
      inputs: [
        { id: 'user', name: 'Пользователь', type: 'User', required: true }
      ],
      outputs: [
        { id: 'groups', name: 'Группы', type: 'Array' }
      ]
    }
  });

  registry.registerNodeType({
    type: 'user:get_permissions',
    label: '🔑 Получить права',
    category: 'Пользователь',
    description: 'Возвращает массив прав пользователя.',
    graphType: all,
    evaluator: require('../nodes/users/get_permissions').evaluate,
    pins: {
      inputs: [
        { id: 'user', name: 'Пользователь', type: 'User', required: true }
      ],
      outputs: [
        { id: 'permissions', name: 'Права', type: 'Array' }
      ]
    }
  });
}

module.exports = { registerNodes };
