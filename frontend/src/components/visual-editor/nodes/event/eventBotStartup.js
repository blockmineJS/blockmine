import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды event:botStartup
 * Срабатывает один раз при запуске бота
 */
export const eventBotStartupDefinition = new NodeDefinition({
  type: 'event:botStartup',
  category: 'event',
  label: '🚀 При запуске бота',
  description: 'Срабатывает один раз при запуске бота',

  computeInputs: (data) => [],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  theme: {
    headerColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
});

export default eventBotStartupDefinition;
