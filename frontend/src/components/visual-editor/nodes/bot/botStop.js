import { NodeDefinition } from '../../core/registry';

export const botStopDefinition = new NodeDefinition({
  type: 'bot:stop',
  category: 'bot',
  label: 'Выключить бота',
  description: 'Останавливает бота',

  computeInputs: () => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  computeOutputs: () => [],

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default botStopDefinition;
