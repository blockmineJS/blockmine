import { NodeDefinition } from '../../core/registry';

export const userCheckPermissionDefinition = new NodeDefinition({
  type: 'user:check_permission',
  category: 'user',
  label: 'Проверить право',
  description: 'Проверяет, есть ли у пользователя указанное право',

  computeInputs: (data) => [
    { id: 'user', name: 'Пользователь', type: 'User', required: true },
    { id: 'permission', name: 'Право', type: 'String', required: true, inlineField: true, placeholder: 'admin.*' },
  ],

  computeOutputs: () => [
    { id: 'has_permission', name: 'Есть право', type: 'Boolean' },
  ],

  defaultData: { permission: '' },

  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userCheckPermissionDefinition;
