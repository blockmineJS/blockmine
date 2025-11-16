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

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'user', name: 'Пользователь', type: 'User', description: 'Пользователь', required: true },
    {
      id: 'blacklist_status',
      name: 'Статус ЧС',
      type: 'Boolean',
      description: 'True = добавить в ЧС',
      required: false,
      inlineField: true,
      placeholder: 'true'
    },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
    { id: 'updated_user', name: 'Обновленный пользователь', type: 'User' },
  ],

  defaultData: {
    blacklist_status: true,
  },

  theme: {
    headerColor: '#14b8a6',
    accentColor: '#2dd4bf',
  },
});

export default userSetBlacklistDefinition;
