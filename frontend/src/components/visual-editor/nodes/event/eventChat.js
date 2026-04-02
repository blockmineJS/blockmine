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

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'username', name: 'Игрок', type: 'String' },
    { id: 'message', name: 'Сообщение', type: 'String' },
    { id: 'chatType', name: 'Тип чата', type: 'String' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventChatDefinition;
