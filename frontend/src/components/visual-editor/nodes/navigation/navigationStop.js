import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды navigation:stop
 * Останавливает текущее движение бота
 */
export const navigationStopDefinition = new NodeDefinition({
  type: 'navigation:stop',
  category: 'navigation',
  label: 'Остановиться',
  description: 'Останавливает текущее движение/следование бота',

  computeInputs: (data) => [
    { id: 'exec', name: 'Выполнить', type: 'Exec' },
  ],

  computeOutputs: (data) => [
    { id: 'exec', name: 'Выполнено', type: 'Exec' },
  ],

  defaultData: {},

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationStopDefinition;
