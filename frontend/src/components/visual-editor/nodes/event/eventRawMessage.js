import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:raw_message
 * Срабатывает при получении любого сырого сообщения
 */
export const eventRawMessageDefinition = new NodeDefinition({
  type: 'event:raw_message',
  category: 'event',
  label: '📝 Сырое сообщение',
  description: 'Срабатывает при получении любого сообщения в сыром виде (до парсинга)',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'rawText', name: 'Сырой текст', type: 'String' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventRawMessageDefinition;
