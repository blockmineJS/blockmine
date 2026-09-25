import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:update_command
 * Редактирует существующую команду
 */
export const actionUpdateCommandDefinition = new NodeDefinition({
  type: 'action:update_command',
  category: 'action',
  label: 'Редактировать команду',
  description: 'Изменяет параметры существующей команды',



  defaultData: {
    commandName: '',
    newName: '',
    description: '',
    aliases: '[]',
    cooldown: 0,
    allowedChatTypes: '["chat", "private", "local", "global"]',
    permissionName: '',
  },

  theme: {
    headerColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
});

export default actionUpdateCommandDefinition;
