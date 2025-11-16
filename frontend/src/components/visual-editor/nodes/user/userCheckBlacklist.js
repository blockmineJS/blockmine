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

  computeInputs: (data) => [
    { id: 'user', name: 'Пользователь', type: 'User', description: 'Пользователь для проверки', required: true },
  ],

  computeOutputs: (data) => [
    { id: 'is_blacklisted', name: 'В ЧС', type: 'Boolean', description: 'True если в черном списке' },
  ],

  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userCheckBlacklistDefinition;
