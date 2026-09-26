import { NodeDefinition } from '../../core/registry';

export const botRestartDefinition = new NodeDefinition({
  type: 'bot:restart',
  category: 'bot',
  label: 'Перезапустить бота',
  description: 'Останавливает бота и запускает его снова',
  computeInputs: () => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],
  computeOutputs: () => [],
  theme: {
    headerColor: '#d97706',
    accentColor: '#f59e0b',
  },
});

export default botRestartDefinition;
