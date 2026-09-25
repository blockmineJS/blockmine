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



  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userGetPermissionsDefinition;
