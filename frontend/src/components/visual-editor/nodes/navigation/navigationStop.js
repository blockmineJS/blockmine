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



  defaultData: {},

  theme: {
    headerColor: '#06b6d4',
    accentColor: '#22d3ee',
  },
});

export default navigationStopDefinition;
