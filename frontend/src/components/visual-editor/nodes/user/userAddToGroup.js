import { NodeDefinition } from '../../core/registry';

export const userAddToGroupDefinition = new NodeDefinition({
  type: 'user:add_to_group',
  category: 'user',
  label: 'Добавить в группу',
  description: 'Добавляет пользователя в указанную группу',



  defaultData: { group: '' },

  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userAddToGroupDefinition;
