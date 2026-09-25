import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды user:set_blacklist
 * Добавляет или убирает пользователя из черного списка
 */
export const userSetBlacklistDefinition = new NodeDefinition({
  type: 'user:set_blacklist',
  category: 'user',
  label: 'Установить ЧС',
  description: 'Управляет черным списком пользователя',



  defaultData: {
    blacklist_status: true,
  },

  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userSetBlacklistDefinition;
