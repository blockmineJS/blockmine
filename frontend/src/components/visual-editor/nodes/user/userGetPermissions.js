import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды user:get_permissions
 * Возвращает массив прав пользователя
 */
export const userGetPermissionsDefinition = new NodeDefinition({
  type: 'user:get_permissions',
  category: 'user',
  label: 'Получить разрешения',
  description: 'Возвращает права пользователя',

  computeInputs: (data) => [
    { id: 'user', name: 'Пользователь', type: 'User', description: 'Пользователь', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'permissions', name: 'Права', type: 'Array', description: 'Массив прав' },
  ],

  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userGetPermissionsDefinition;
