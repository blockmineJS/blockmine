import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:chat
 * Срабатывает при получении сообщения в чате
 */
export const eventChatDefinition = new NodeDefinition({
  type: 'event:chat',
  category: 'event',
  label: 'Сообщение в чате',
  description: 'Срабатывает, когда в чат приходит сообщение',



  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventChatDefinition;
