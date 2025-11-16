import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:botDied
 * Срабатывает когда бот умирает
 */
export const eventBotDiedDefinition = new NodeDefinition({
  type: 'event:botDied',
  category: 'event',
  label: '💀 Бот умер',
  description: 'Срабатывает, когда бот умирает',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventBotDiedDefinition;
