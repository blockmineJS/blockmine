import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды user:get_groups
 * Возвращает массив названий групп, в которых состоит пользователь
 */
export const userGetGroupsDefinition = new NodeDefinition({
  type: 'user:get_groups',
  category: 'user',
  label: 'Получить группы',
  description: 'Возвращает группы пользователя',

  computeInputs: (data) => [
    { id: 'user', name: 'Пользователь', type: 'User', description: 'Пользователь', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'groups', name: 'Группы', type: 'Array', description: 'Массив групп' },
  ],

  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userGetGroupsDefinition;
