import { NodeDefinition } from '../../core/registry';

export const userRemoveFromGroupDefinition = new NodeDefinition({
  type: 'user:remove_from_group',
  category: 'user',
  label: 'Убрать из группы',
  description: 'Убирает пользователя из указанной группы',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec', required: true },
    { id: 'user', name: 'Пользователь', type: 'User', required: true },
    { id: 'group', name: 'Группа', type: 'String', required: true, inlineField: true, placeholder: 'Admin' },
  ],

  computeOutputs: () => [
    { id: 'exec', name: 'Далее', type: 'Exec' },
  ],

  defaultData: { group: '' },

  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userRemoveFromGroupDefinition;
