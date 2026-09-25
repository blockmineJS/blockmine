import { NodeDefinition } from '../../core/registry';

/**
 * Определение ноды furnace:take_output
 * Забирает готовый предмет из слота результата печки
 */
export const furnaceTakeOutputDefinition = new NodeDefinition({
  type: 'furnace:take_output',
  category: 'furnace',
  label: 'Печка: забрать результат',
  description: 'Забирает готовый предмет из слота результата печки',



  defaultData: {},

  theme: {
    headerColor: '#dc2626',
    accentColor: '#ef4444',
  },
});

export default furnaceTakeOutputDefinition;
