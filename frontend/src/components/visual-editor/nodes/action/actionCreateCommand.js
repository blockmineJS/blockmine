import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды action:create_command
 * Создает новую команду (временную или постоянную)
 */
export const actionCreateCommandDefinition = new NodeDefinition({
  type: 'action:create_command',
  category: 'action',
  label: 'Создать команду',
  description: 'Создает новую команду для бота (временную или постоянную)',



  defaultData: {
    name: '',
    description: '',
    aliases: '[]',
    cooldown: 0,
    allowedChatTypes: '["chat", "private"]',
    permissionName: '',
    temporary: false,
  },

  theme: {
    headerColor: '#10b981',
    accentColor: '#34d399',
  },
});

export default actionCreateCommandDefinition;
