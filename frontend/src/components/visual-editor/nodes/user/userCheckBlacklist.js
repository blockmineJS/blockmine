import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды user:check_blacklist
 * Проверяет, находится ли пользователь в черном списке
 */
export const userCheckBlacklistDefinition = new NodeDefinition({
  type: 'user:check_blacklist',
  category: 'user',
  label: 'Проверить ЧС',
  description: 'Проверяет, находится ли пользователь в черном списке',



  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userCheckBlacklistDefinition;
