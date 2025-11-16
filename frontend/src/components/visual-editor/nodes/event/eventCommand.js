import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:command
 * Стартовая точка для графа команды
 */
export const eventCommandDefinition = new NodeDefinition({
  type: 'event:command',
  category: 'event',
  label: '▶️ При выполнении команды',
  description: 'Стартовая точка для графа команды',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
    { id: 'command_name', name: 'Имя команды', type: 'String' },
    { id: 'user', name: 'Пользователь', type: 'User' },
    { id: 'args', name: 'Аргументы', type: 'Object' },
    { id: 'chat_type', name: 'Тип чата', type: 'String' },
    { id: 'success', name: 'Успешно', type: 'Boolean', description: 'Возвращает true, если команда не попала на ошибку' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventCommandDefinition;
